import type {
  GitHubProblem,
  RemoteRefusedReason,
  UpdatesProblem,
  VersionsOffReason,
  VersionsProblem,
} from "@glose/contracts";
import type { Appearance, Mode, ThemeId } from "../../theme/paint.ts";
import type { Face, Width } from "../../theme/writingText.ts";
import { nightlyOf } from "../../domain/appVersion.ts";
import { numbers, count, clockTime, shortDate } from "./format.ts";

export const settingsMessages = {
  updates: {
    version: (version: string) => {
      const nightly = nightlyOf(version);
      return nightly === null
        ? version
        : `Nightly ${shortDate.format(nightly.built)} (${numbers.format(nightly.run)})`;
    },
    check: "Check for updates",
    checking: "Checking…",
    upToDate: "Glose is up to date.",
    notChecked: "Not checked yet.",
    checkingLong: "Checking for updates…",
    update: "Update",
    restart: "Restart to update",
    percent: (percent: number) => `${numbers.format(percent)}%`,
    downloading: (version: string, percent: number) =>
      `Downloading ${version}: ${numbers.format(percent)}%`,
    available: (version: string) => `${version} is ready to download.`,
    downloaded: (version: string) => `${version} is downloaded.`,
    restartHint: "Glose closes and opens again with the new version.",
    running: (version: string) => `You have ${version}.`,
    checked: (at: Date, today: boolean) =>
      `Checked ${today ? clockTime.format(at) : shortDate.format(at)}.`,
    everyHour: "Glose checks every hour.",
    problemsShort: {
      "check-failed": "Not checked",
      "download-failed": "Not downloaded",
      "install-failed": "Not installed",
    } satisfies Record<UpdatesProblem, string>,
    problems: {
      "check-failed": "Glose could not reach GitHub. Click to try again.",
      "download-failed": "The download stopped. Click to try again.",
      "install-failed": "The update did not install. Click to try again.",
    } satisfies Record<UpdatesProblem, string>,
  },
  versions: {
    title: "Versions of your Vault",
    off: "No versions",
    offReasons: {
      "no-vault": "Glose keeps versions once you choose a Vault.",
      "no-git":
        "Git is not installed on this computer. Install Git and start Glose again to keep versions of your Vault.",
      "other-repository":
        "The Vault is inside another git repository. Glose does not make commits there.",
      failed: "Git could not start a repository in the Vault.",
    } satisfies Record<VersionsOffReason, string>,
    saved: (at: Date, today: boolean) =>
      `Saved ${today ? clockTime.format(at) : shortDate.format(at)}`,
    notSavedYet: "Not saved yet",
    saving: "Saving…",
    syncing: "Syncing…",
    unsaved: "Changes not saved yet",
    changes: "Changes",
    allSaved: "All saved.",
    pending: "Not saved yet. Glose saves them after 5 minutes without changes.",
    remote: "Remote",
    noRemote: "Only on this computer.",
    sync: "Sync",
    synced: (at: Date, today: boolean) =>
      `Synced ${today ? clockTime.format(at) : shortDate.format(at)}.`,
    notSynced: "Not synced since Glose started.",
    unpushed: (n: number) => `${count(n, "version", "versions")} not pushed yet.`,
    problemsShort: {
      conflict: "Sync conflict",
      "sync-failed": "Not synced",
      "save-failed": "Not saved",
    } satisfies Record<VersionsProblem, string>,
    problems: {
      conflict:
        "The same lines changed on this computer and on the remote. Glose kept all versions and did not sync. Join the changes with git. Then Glose syncs again.",
      "sync-failed": "Glose could not sync with the remote. Glose tries again after the next save.",
      "save-failed": "Git could not save a version. Glose tries again at the next change.",
    } satisfies Record<VersionsProblem, string>,
    endDay: "End the day",
    endDayHint: "Write one line about today. Glose saves it as a version and syncs it.",
    summary: "Today",
    summaryPlaceholder: "Read Arendt, wrote two Notes",
    dayEnded: "The day is saved as a version.",
  },
  backup: {
    title: "Backup",
    versions: "Versions",
    onlyHere: "Only on this computer",
    lastSaved: "Last saved",
    savedAt: (at: Date, today: boolean) =>
      today ? `Today ${clockTime.format(at)}` : shortDate.format(at),
    risk: "If this computer is lost or breaks, your Vault is lost with it.",
    backUpToGitHub: "Back up to GitHub",
    useRemote: "Use another git remote",
    backedUpTo: "Backed up to",
    lastSync: "Last sync",
    github: "GitHub",
    notConnected: "Not connected",
    disconnectGitHub: "Disconnect GitHub",
    stop: "Stop backing up",
    stopQuestion: (place: string) =>
      `Stop backing up? Glose keeps every version on this computer, and the copy at ${place} stays as it is.`,
    keep: "Keep backing up",
    step: (n: number, of: number) => `Step ${n} of ${of}`,
    intro:
      "GitHub keeps a private copy of every version, free. Only you can see it, and later you can open your Vault on another computer.",
    connect: "Connect GitHub",
    noAccount: "No GitHub account?",
    createAccount: "Create one, free",
    unavailable:
      "This copy of Glose cannot connect to GitHub. You can still use another git remote.",
    codeIntro: "Type this code on GitHub's page. It lets Glose make your private repository.",
    code: "Code for GitHub",
    copy: "Copy code",
    copied: "Copied",
    openAgain: "Open GitHub again",
    waiting:
      "Waiting for GitHub. Type the code on the page that opened. Glose continues by itself.",
    cancel: "Cancel",
    signedIn: (login: string) => `Signed in to GitHub as ${login}.`,
    otherAccount: "Use another account",
    repository: "Repository name",
    repositoryHint:
      "Private. Glose makes it if you have no repository of this name. If you have one, Glose uses it.",
    repositoryInvalid: "Use only letters, digits and the signs - _ and .",
    backUp: "Back up",
    backingUp: "Backing up…",
    done: "Backed up. Every version is on GitHub now, and Glose keeps it up to date after each save.",
    close: "Done",
    remoteIntro:
      "Glose pushes to a git remote you already have, with your own git sign-in: an SSH key or a credential helper.",
    remoteUrl: "Remote address",
    remotePlaceholder: "git@example.com:you/glose-vault.git",
    useThisRemote: "Use this remote",
    checking: "Checking…",
    remoteDone: "Backed up. Glose keeps the remote up to date after each save.",
    problems: {
      declined: "You declined on GitHub, so Glose is not connected.",
      "timed-out": "The code expired before GitHub got it. Connect again for a new code.",
      expired: "GitHub no longer accepts the sign-in. Connect again.",
      failed: "Glose could not connect to GitHub. Try again.",
    } satisfies Record<GitHubProblem, string>,
    refused: {
      "versions-off": "Glose keeps no versions now, so there is nothing to back up.",
      "github-not-connected": "Glose is not connected to GitHub now. Connect again.",
      "public-repository":
        "You have a public repository of this name. Glose never puts your Vault where everyone can read it. Choose another name.",
      "github-failed": "GitHub did not make the repository. Try again in a moment.",
      unreachable:
        "Git could not reach that remote, or could not sign in to it. Check the address, and that git on this computer can push there.",
      "other-vault":
        "That remote holds another Vault. Glose does not mix two Vaults. Use an empty remote, or the one of this Vault.",
    } satisfies Record<RemoteRefusedReason, string>,
  },
  appearance: {
    title: "Appearance",
    mode: "Light or dark",
    modes: { light: "Light", dark: "Dark", system: "Same as the computer" } satisfies Record<
      Mode,
      string
    >,
    systemNow: {
      light: "The computer is light now.",
      dark: "The computer is dark now.",
    } satisfies Record<Appearance, string>,
    theme: "Theme",
    themes: { lapis: "Lapis", murex: "Murex", sepia: "Sepia" } satisfies Record<ThemeId, string>,
    hint: "Every theme comes in a light and a dark version.",
  },
  text: {
    title: "Text",
    lead: "How your words look while you write.",
    sampleLabel: "A sample of your text",
    faceSample: "Ag",
    sizeGlyph: "A",
    sample: "Ahrens puts it plainly: writing is the medium the thinking happens in.",
    sampleLetters: "Æble, ø og å.",
    sampleNote: "Writing is the medium of thinking",
    sampleCall: "AHR 2017 · p. 26",
    lineLength: (width: string, characters: number) =>
      `${width}: about ${numbers.format(characters)} characters a line`,
    scope: "For every piece on this computer. Preview shows the post as readers will see it.",
    face: "Typeface",
    faces: { plain: "Plain", book: "Book", typewriter: "Typewriter" } satisfies Record<
      Face,
      string
    >,
    size: "Text size",
    sizeLabel: (size: number) => `${numbers.format(size)} pixels`,
    sizeHint: (size: number) => `${numbers.format(size)} is the standard size.`,
    width: "Width",
    widths: { narrow: "Narrow", standard: "Standard", wide: "Wide" } satisfies Record<
      Width,
      string
    >,
    focusLead: "hides everything on the desk but your text.",
    focusWays: "The Focus button on the desk, or",
    overview: "Show an overview beside the text",
    overviewLead:
      "A small picture of the whole piece at the right edge of the desk, in Write. Click it to go to a place, or drag the box to scroll. It shows when the window has room for it.",
  },
  settings: {
    title: "Settings",
    language: "Interface language",
    vaultFolder: "Vault",
    vaultFolderHint: "Changing the folder comes in a later version.",
    site: "Your website",
    siteNotChosen: "Not chosen yet.",
    sections: "Parts of Settings",
    close: "Close Settings",
    closeKey: "Esc",
    siteHint: "Glose writes Blog posts into src/_posts in this folder.",
  },
};
