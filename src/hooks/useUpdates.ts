import { useStore } from "@/hooks/useStore";
import { cliCheckUpdates, cliUpdateSkills, cliUpdateSkill, listSkills } from "@/lib/tauri";
import type { UpdateInfo } from "@/types/skills";

/**
 * Parse `npx skills check` stdout to extract skill names with available updates.
 * Handles common output patterns:
 *   - "skill-name: 1.0.0 -> 1.1.0"
 *   - "skill-name: 1.0.0 => 1.1.0"
 *   - Lines containing "update available" near a skill name
 */
function parseCheckOutput(stdout: string, knownSkillNames: string[]): UpdateInfo[] {
  const updates: UpdateInfo[] = [];
  const lines = stdout.split("\n");
  const versionPattern = /(\S+):\s*([\d.]+(?:-\S+)?)\s*(?:->|=>)\s*([\d.]+(?:-\S+)?)/;

  for (const line of lines) {
    const match = line.match(versionPattern);
    if (match) {
      updates.push({
        skillName: match[1],
        currentVersion: match[2],
        latestVersion: match[3],
      });
      continue;
    }

    // Fallback: if a known skill name appears in a line with update keywords
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes("update") ||
      lowerLine.includes("outdated") ||
      lowerLine.includes("new version")
    ) {
      for (const name of knownSkillNames) {
        if (line.includes(name) && !updates.find((u) => u.skillName === name)) {
          updates.push({ skillName: name });
        }
      }
    }
  }

  return updates;
}

export function useUpdates() {
  const skills = useStore((s) => s.skills);
  const setSkills = useStore((s) => s.setSkills);
  const appendCliOutput = useStore((s) => s.appendCliOutput);
  const setPendingUpdates = useStore((s) => s.setPendingUpdates);
  const setLastCheckedAt = useStore((s) => s.setLastCheckedAt);
  const setCheckingUpdates = useStore((s) => s.setCheckingUpdates);
  const setUpdatingSkills = useStore((s) => s.setUpdatingSkills);
  const pendingUpdates = useStore((s) => s.pendingUpdates);
  const lastCheckedAt = useStore((s) => s.lastCheckedAt);
  const checkingUpdates = useStore((s) => s.checkingUpdates);
  const updatingSkills = useStore((s) => s.updatingSkills);

  async function checkForUpdates() {
    setCheckingUpdates(true);
    appendCliOutput("Checking for skill updates...");
    try {
      const result = await cliCheckUpdates();
      if (result.stdout) appendCliOutput(result.stdout);
      if (result.stderr) appendCliOutput(result.stderr);

      const knownNames = skills.map((s) => s.name);
      const updates = parseCheckOutput(result.stdout, knownNames);
      setPendingUpdates(updates);
      setLastCheckedAt(new Date().toISOString());

      // Mark has_update on matching skills in store
      if (updates.length > 0) {
        const updatedNames = new Set(updates.map((u) => u.skillName));
        const current = useStore.getState().skills;
        setSkills(
          current.map((s) => ({ ...s, has_update: updatedNames.has(s.name) }))
        );
        appendCliOutput(`Found ${updates.length} skill(s) with updates available.`);
      } else {
        const current = useStore.getState().skills;
        setSkills(current.map((s) => ({ ...s, has_update: false })));
        appendCliOutput("All skills are up to date.");
      }
    } catch (err) {
      appendCliOutput(`Error checking updates: ${err}`);
    } finally {
      setCheckingUpdates(false);
    }
  }

  async function updateAllSkills(onDone?: () => void) {
    setUpdatingSkills(true);
    appendCliOutput("Updating all skills...");
    try {
      const result = await cliUpdateSkills();
      if (result.stdout) appendCliOutput(result.stdout);
      if (result.stderr) appendCliOutput(result.stderr);
      appendCliOutput("Update complete.");
      // Clear pending updates and refresh skill list
      setPendingUpdates([]);
      const refreshed = await listSkills("all");
      setSkills(refreshed);
      onDone?.();
    } catch (err) {
      appendCliOutput(`Error updating skills: ${err}`);
    } finally {
      setUpdatingSkills(false);
    }
  }

  async function updateSkill(skillName: string, onDone?: () => void) {
    setUpdatingSkills(true);
    appendCliOutput(`Updating skill: ${skillName}...`);
    try {
      const result = await cliUpdateSkill(skillName);
      if (result.stdout) appendCliOutput(result.stdout);
      if (result.stderr) appendCliOutput(result.stderr);
      appendCliOutput(`Updated ${skillName}.`);
      // Remove from pending updates and refresh
      setPendingUpdates(useStore.getState().pendingUpdates.filter((u) => u.skillName !== skillName));
      const refreshed = await listSkills("all");
      setSkills(refreshed);
      onDone?.();
    } catch (err) {
      appendCliOutput(`Error updating ${skillName}: ${err}`);
    } finally {
      setUpdatingSkills(false);
    }
  }

  return {
    pendingUpdates,
    lastCheckedAt,
    checkingUpdates,
    updatingSkills,
    checkForUpdates,
    updateAllSkills,
    updateSkill,
  };
}
