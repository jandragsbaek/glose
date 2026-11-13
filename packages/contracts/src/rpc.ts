import * as Rpc from "effect/rpc/Rpc";
import * as RpcGroup from "effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

import {
  Card,
  CardNotFound,
  CardRef,
  CreateCard,
  JudgeCards,
  ScoredCard,
  UpdateCard,
} from "./card.ts";
import { CatalogRecord, CatalogSearch, CatalogUnavailable } from "./catalog.ts";
import { ChatGptStatus, ConnectChatGpt, DisconnectResult } from "./chatgpt.ts";
import { GitHubRepository, GitHubStatus } from "./github.ts";
import { GraphView, NoteNameTaken, NoteNotFound, SaveNote } from "./graph.ts";
import { RecordReview, ReviewQueue } from "./recall.ts";
import { ServerInfo } from "./server.ts";
import {
  AddPoint,
  AnswerProbe,
  DropProposal,
  FindSession,
  KeepPoint,
  KeepProposal,
  PointNotFound,
  PointRef,
  ProposalNotOpen,
  QuestionNotOpen,
  SendMessage,
  SendPassage,
  Session,
  SessionBusy,
  SessionNotFound,
  SessionRef,
  StartSession,
  WritePoint,
} from "./session.ts";
import {
  CheckRemote,
  CompleteSetup,
  GraphFolderNotSet,
  GraphFolderUnavailable,
  GraphRemoteUnavailable,
  Language,
  SettingsView,
  StorageError,
} from "./settings.ts";
import {
  ChooseReadingStart,
  AdvanceReading,
  SaveFreeText,
  Source,
  SourceDetails,
  SourceNameTaken,
  SourceNotFound,
  SourceRef,
} from "./source.ts";
import { BackUpToGitHub, EndDay, RemoteRefused, SetRemote, VersionsStatus } from "./versions.ts";
import {
  PublicationExists,
  PublicationNotReady,
  PublicationRecord,
  PublishWritingProject,
  SaveWritingProject,
  SetSiteFolder,
  SiteFolderNotSet,
  SiteFolderUnavailable,
  WritingProject,
  WritingProjectFields,
  WritingProjectNameTaken,
  WritingProjectNotFound,
  WritingProjectRef,
  WritingReview,
  WritingReviewUnavailable,
} from "./writing.ts";

export const RPC_METHODS = {
  serverInfo: "server.info",
  settingsGet: "settings.get",
  settingsSetLanguage: "settings.setLanguage",
  setupComplete: "setup.complete",
  setupCheckRemote: "setup.checkRemote",
  sourcesList: "sources.list",
  sourcesGet: "sources.get",
  sourcesCreate: "sources.create",
  sourcesSaveFreeText: "sources.saveFreeText",
  sourcesChooseStart: "sources.chooseStart",
  sourcesAdvance: "sources.advance",
  graphRead: "graph.read",
  notesSave: "notes.save",
  catalogSearch: "catalog.search",
  chatgptWatch: "chatgpt.watch",
  chatgptConnect: "chatgpt.connect",
  chatgptCancel: "chatgpt.cancel",
  chatgptDisconnect: "chatgpt.disconnect",
  chatgptDismissPlanNotice: "chatgpt.dismissPlanNotice",
  githubWatch: "github.watch",
  githubConnect: "github.connect",
  githubCancel: "github.cancel",
  githubDisconnect: "github.disconnect",
  githubRepositories: "github.repositories",
  sessionsFind: "sessions.find",
  sessionsStart: "sessions.start",
  sessionsWatch: "sessions.watch",
  sessionsSend: "sessions.send",
  sessionsRetry: "sessions.retry",
  sessionsStop: "sessions.stop",
  sessionsSendPassage: "sessions.sendPassage",
  sessionsKeepProposal: "sessions.keepProposal",
  sessionsDropProposal: "sessions.dropProposal",
  sessionsKeepPoint: "sessions.keepPoint",
  sessionsDropPoint: "sessions.dropPoint",
  sessionsRestorePoint: "sessions.restorePoint",
  sessionsAddPoint: "sessions.addPoint",
  sessionsWritePoint: "sessions.writePoint",
  sessionsAnswerProbe: "sessions.answerProbe",
  sessionsFinishProbe: "sessions.finishProbe",
  cardsList: "cards.list",
  cardsJudge: "cards.judge",
  cardsCreate: "cards.create",
  cardsUpdate: "cards.update",
  cardsClearAiMark: "cards.clearAiMark",
  cardsDelete: "cards.delete",
  recallQueue: "recall.queue",
  recallReview: "recall.review",
  versionsWatch: "versions.watch",
  versionsEndDay: "versions.endDay",
  versionsBackUpToGitHub: "versions.backUpToGitHub",
  versionsSetRemote: "versions.setRemote",
  versionsRemoveRemote: "versions.removeRemote",
  settingsSetSiteFolder: "settings.setSiteFolder",
  writingList: "writing.list",
  writingGet: "writing.get",
  writingCreate: "writing.create",
  writingSave: "writing.save",
  writingReview: "writing.review",
  writingPublish: "writing.publish",
} as const;

export const RPC_PATH = "/rpc";

/** Plain HTTP, outside RPC: answers once the server accepts requests. */
export const HEALTH_PATH = "/health";

const GraphErrors = Schema.Union([GraphFolderNotSet, StorageError]);

export const GloseRpcGroup = RpcGroup.make(
  Rpc.make(RPC_METHODS.serverInfo, { success: ServerInfo }),
  Rpc.make(RPC_METHODS.settingsGet, { success: SettingsView, error: StorageError }),
  Rpc.make(RPC_METHODS.settingsSetLanguage, {
    payload: { language: Language },
    success: SettingsView,
    error: StorageError,
  }),
  Rpc.make(RPC_METHODS.setupComplete, {
    payload: CompleteSetup,
    success: SettingsView,
    error: Schema.Union([GraphFolderUnavailable, GraphRemoteUnavailable, StorageError]),
  }),
  /** Checks that git on this computer can read a remote, before setup copies a Graph from it. */
  Rpc.make(RPC_METHODS.setupCheckRemote, { payload: CheckRemote, error: GraphRemoteUnavailable }),
  Rpc.make(RPC_METHODS.sourcesList, { success: Schema.Array(Source), error: GraphErrors }),
  Rpc.make(RPC_METHODS.sourcesGet, {
    payload: SourceRef,
    success: Source,
    error: Schema.Union([SourceNotFound, GraphFolderNotSet, StorageError]),
  }),
  Rpc.make(RPC_METHODS.sourcesCreate, {
    payload: SourceDetails,
    success: Source,
    error: Schema.Union([SourceNameTaken, GraphFolderNotSet, StorageError]),
  }),
  Rpc.make(RPC_METHODS.sourcesSaveFreeText, {
    payload: SaveFreeText,
    success: Source,
    error: Schema.Union([SourceNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** Records the answer to "Where are you with this book?", which sets the first step. */
  Rpc.make(RPC_METHODS.sourcesChooseStart, {
    payload: ChooseReadingStart,
    success: Source,
    error: Schema.Union([SourceNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** Moves a Source to its next Reading step, if it is still at `from`. */
  Rpc.make(RPC_METHODS.sourcesAdvance, {
    payload: AdvanceReading,
    success: Source,
    error: Schema.Union([SourceNotFound, GraphFolderNotSet, StorageError]),
  }),
  Rpc.make(RPC_METHODS.graphRead, { success: GraphView, error: GraphErrors }),
  /**
   * Saves a Note the user edited; returns its file name. A new title renames the file, and every
   * wikilink to the Note in the Graph folder and its Cards follows the new name.
   */
  Rpc.make(RPC_METHODS.notesSave, {
    payload: SaveNote,
    success: Schema.String,
    error: Schema.Union([NoteNotFound, NoteNameTaken, GraphFolderNotSet, StorageError]),
  }),
  /** Works in the Catalog that match the search, best match first. */
  Rpc.make(RPC_METHODS.catalogSearch, {
    payload: CatalogSearch,
    success: Schema.Array(CatalogRecord),
    error: CatalogUnavailable,
  }),
  /** The current status, then every change to it. */
  Rpc.make(RPC_METHODS.chatgptWatch, { success: ChatGptStatus, stream: true }),
  /** Starts a sign-in in the browser; the status follows it. */
  Rpc.make(RPC_METHODS.chatgptConnect, { payload: ConnectChatGpt, error: StorageError }),
  Rpc.make(RPC_METHODS.chatgptCancel),
  Rpc.make(RPC_METHODS.chatgptDisconnect, { success: DisconnectResult, error: StorageError }),
  Rpc.make(RPC_METHODS.chatgptDismissPlanNotice, { error: StorageError }),
  /** The GitHub connection now, then every change to it. */
  Rpc.make(RPC_METHODS.githubWatch, { success: GitHubStatus, stream: true }),
  /** Asks GitHub for a code and opens its page; the status shows the code and follows it. */
  Rpc.make(RPC_METHODS.githubConnect),
  Rpc.make(RPC_METHODS.githubCancel),
  /** Forgets this computer's GitHub sign-in. The repository and its Versions stay on GitHub. */
  Rpc.make(RPC_METHODS.githubDisconnect, { error: StorageError }),
  /** The connected account's private repositories, Graphs first, to copy a Graph from. */
  Rpc.make(RPC_METHODS.githubRepositories, {
    success: Schema.Array(GitHubRepository),
    error: RemoteRefused,
  }),
  /** The latest Session of a kind for a Graph file, or null when there is none. */
  Rpc.make(RPC_METHODS.sessionsFind, {
    payload: FindSession,
    success: Schema.NullOr(Session),
    error: GraphErrors,
  }),
  /** Starts a Session; the AI takes the first turn at once. */
  Rpc.make(RPC_METHODS.sessionsStart, {
    payload: StartSession,
    success: Session,
    error: Schema.Union([SourceNotFound, NoteNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** The Session now, then every change to it, including the AI's answer as it arrives. */
  Rpc.make(RPC_METHODS.sessionsWatch, {
    payload: SessionRef,
    success: Session,
    error: Schema.Union([SessionNotFound, GraphFolderNotSet, StorageError]),
    stream: true,
  }),
  Rpc.make(RPC_METHODS.sessionsSend, {
    payload: SendMessage,
    error: Schema.Union([SessionNotFound, SessionBusy, GraphFolderNotSet, StorageError]),
  }),
  /** Runs the last turn again after a problem. */
  Rpc.make(RPC_METHODS.sessionsRetry, {
    payload: SessionRef,
    error: Schema.Union([SessionNotFound, SessionBusy, GraphFolderNotSet, StorageError]),
  }),
  /** Stops the AI's current turn; what it already said stays. */
  Rpc.make(RPC_METHODS.sessionsStop, { payload: SessionRef }),
  /** Card Extraction from another passage of the Note; the AI takes a turn. */
  Rpc.make(RPC_METHODS.sessionsSendPassage, {
    payload: SendPassage,
    error: Schema.Union([SessionNotFound, SessionBusy, GraphFolderNotSet, StorageError]),
  }),
  /** Saves a proposed Card, as the user changed it, as an AI-written Card. */
  Rpc.make(RPC_METHODS.sessionsKeepProposal, {
    payload: KeepProposal,
    success: Card,
    error: Schema.Union([SessionNotFound, ProposalNotOpen, GraphFolderNotSet, StorageError]),
  }),
  Rpc.make(RPC_METHODS.sessionsDropProposal, {
    payload: DropProposal,
    error: Schema.Union([SessionNotFound, ProposalNotOpen, GraphFolderNotSet, StorageError]),
  }),
  /** Keeps a proposed Point to write as a Note; the next turn tells the AI. */
  Rpc.make(RPC_METHODS.sessionsKeepPoint, {
    payload: KeepPoint,
    error: Schema.Union([SessionNotFound, PointNotFound, GraphFolderNotSet, StorageError]),
  }),
  Rpc.make(RPC_METHODS.sessionsDropPoint, {
    payload: PointRef,
    error: Schema.Union([SessionNotFound, PointNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** Brings a dropped Point back to decide on again. */
  Rpc.make(RPC_METHODS.sessionsRestorePoint, {
    payload: PointRef,
    error: Schema.Union([SessionNotFound, PointNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** A Point in the user's own words, kept to write. */
  Rpc.make(RPC_METHODS.sessionsAddPoint, {
    payload: AddPoint,
    error: Schema.Union([SessionNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** Writes a kept Point as a Note file in the Graph folder; returns the Note's name. */
  Rpc.make(RPC_METHODS.sessionsWritePoint, {
    payload: WritePoint,
    success: Schema.String,
    error: Schema.Union([
      SessionNotFound,
      PointNotFound,
      NoteNameTaken,
      GraphFolderNotSet,
      StorageError,
    ]),
  }),
  /** The user's answer to the open question of a Probe; the AI judges it in its turn. */
  Rpc.make(RPC_METHODS.sessionsAnswerProbe, {
    payload: AnswerProbe,
    error: Schema.Union([
      SessionNotFound,
      SessionBusy,
      QuestionNotOpen,
      GraphFolderNotSet,
      StorageError,
    ]),
  }),
  /** Ends a Probe; its record in `Probes/` keeps what it found. The step stays until the user moves on. */
  Rpc.make(RPC_METHODS.sessionsFinishProbe, {
    payload: SessionRef,
    error: Schema.Union([SessionNotFound, SessionBusy, GraphFolderNotSet, StorageError]),
  }),
  /** Every Card in the Graph folder, in file name order, with its Checks. */
  Rpc.make(RPC_METHODS.cardsList, { success: Schema.Array(ScoredCard), error: GraphErrors }),
  /** Runs the AI Checks of these Cards; the next list shows them. */
  Rpc.make(RPC_METHODS.cardsJudge, { payload: JudgeCards, error: GraphErrors }),
  /** A Card the user writes: their own words, without an AI mark. */
  Rpc.make(RPC_METHODS.cardsCreate, { payload: CreateCard, success: Card, error: GraphErrors }),
  /** New words for a Card. An AI mark stays until the user clears it. */
  Rpc.make(RPC_METHODS.cardsUpdate, {
    payload: UpdateCard,
    success: Card,
    error: Schema.Union([CardNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** The user rewrote an AI-written Card in their own words. */
  Rpc.make(RPC_METHODS.cardsClearAiMark, {
    payload: CardRef,
    success: Card,
    error: Schema.Union([CardNotFound, GraphFolderNotSet, StorageError]),
  }),
  Rpc.make(RPC_METHODS.cardsDelete, {
    payload: CardRef,
    error: Schema.Union([CardNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** What is due today, scheduled by FSRS from every computer's Reviews. */
  Rpc.make(RPC_METHODS.recallQueue, { success: ReviewQueue, error: GraphErrors }),
  /** Keeps one Review in this computer's log; the next queue shows its effect. */
  Rpc.make(RPC_METHODS.recallReview, {
    payload: RecordReview,
    error: Schema.Union([CardNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** The Versions status now, then every change to it. */
  Rpc.make(RPC_METHODS.versionsWatch, { success: VersionsStatus, stream: true }),
  /** Makes a Version named by the user's line about the day, then syncs; the status follows. */
  Rpc.make(RPC_METHODS.versionsEndDay, { payload: EndDay }),
  /** Makes or finds the private repository on GitHub, makes it the remote, and syncs. */
  Rpc.make(RPC_METHODS.versionsBackUpToGitHub, { payload: BackUpToGitHub, error: RemoteRefused }),
  /** Makes a git remote the user already has the remote, and syncs. */
  Rpc.make(RPC_METHODS.versionsSetRemote, { payload: SetRemote, error: RemoteRefused }),
  /** Stops syncing. The Versions stay on this computer and on the old remote. */
  Rpc.make(RPC_METHODS.versionsRemoveRemote),
  /** Chooses the user's Bridgetown site on this computer, where Blog posts are published. */
  Rpc.make(RPC_METHODS.settingsSetSiteFolder, {
    payload: SetSiteFolder,
    success: SettingsView,
    error: Schema.Union([SiteFolderUnavailable, StorageError]),
  }),
  /** Every Writing project, last changed first. */
  Rpc.make(RPC_METHODS.writingList, {
    success: Schema.Array(WritingProject),
    error: GraphErrors,
  }),
  Rpc.make(RPC_METHODS.writingGet, {
    payload: WritingProjectRef,
    success: WritingProject,
    error: Schema.Union([WritingProjectNotFound, GraphFolderNotSet, StorageError]),
  }),
  /** Writes a new Writing project; its file name comes from the title. */
  Rpc.make(RPC_METHODS.writingCreate, {
    payload: WritingProjectFields,
    success: WritingProject,
    error: Schema.Union([WritingProjectNameTaken, GraphFolderNotSet, StorageError]),
  }),
  /** Saves the prose and settings; a new title renames the file. */
  Rpc.make(RPC_METHODS.writingSave, {
    payload: SaveWritingProject,
    success: WritingProject,
    error: Schema.Union([
      WritingProjectNotFound,
      WritingProjectNameTaken,
      GraphFolderNotSet,
      StorageError,
    ]),
  }),
  /** The AI reads the prose and the Graph and flags, suggests and asks; it writes no prose. */
  Rpc.make(RPC_METHODS.writingReview, {
    payload: WritingProjectRef,
    success: WritingReview,
    error: Schema.Union([
      WritingProjectNotFound,
      WritingReviewUnavailable,
      GraphFolderNotSet,
      StorageError,
    ]),
  }),
  /** Writes a Blog post into the site folder as a Bridgetown post. */
  Rpc.make(RPC_METHODS.writingPublish, {
    payload: PublishWritingProject,
    success: PublicationRecord,
    error: Schema.Union([
      WritingProjectNotFound,
      SiteFolderNotSet,
      SiteFolderUnavailable,
      PublicationExists,
      PublicationNotReady,
      GraphFolderNotSet,
      StorageError,
    ]),
  }),
);
