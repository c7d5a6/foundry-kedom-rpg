/**
 * Foundry only lets a message's author or a GM update it. Luck spend / wound / crit
 * buttons are available to the actor's owner, who is often not the author (e.g. GM
 * rolled for the player), so those updates are relayed to an active GM over the system socket.
 */

const CHANNEL = "system.kedom";
const REQUEST_TIMEOUT_MS = 5000;

interface MessagePatch {
  content?: string;
  flags?: { kedom?: Record<string, unknown> };
}

type SocketPayload =
  | {
      type: "updateMessage";
      requestId: string;
      userId: string;
      messageId: string;
      patch: MessagePatch;
    }
  | { type: "updateMessageResult"; requestId: string; ok: boolean };

const pending = new Map<string, (ok: boolean) => void>();

function flagActorUuid(message: ChatMessage.Implementation): string | null {
  const kedom = (message.flags as { kedom?: Record<string, { actorUuid?: string } | undefined> })
    .kedom;
  for (const key of ["check", "attack", "wound"]) {
    const uuid = kedom?.[key]?.actorUuid;
    if (typeof uuid === "string") return uuid;
  }
  return null;
}

/** Update a Kedom chat message; relays to a GM when the current user cannot. Resolves success. */
export async function updateKedomMessage(
  message: ChatMessage.Implementation,
  patch: MessagePatch,
): Promise<boolean> {
  if (message.canUserModify(game.user, "update")) {
    try {
      await message.update(patch as Parameters<ChatMessage.Implementation["update"]>[0]);
      return true;
    } catch (err) {
      console.error("Kedom | message update failed", err);
      return false;
    }
  }
  if (!game.users.activeGM) return false;

  const requestId = foundry.utils.randomID();
  const result = new Promise<boolean>((resolve) => {
    pending.set(requestId, resolve);
    setTimeout(() => {
      if (pending.delete(requestId)) resolve(false);
    }, REQUEST_TIMEOUT_MS);
  });
  const payload: SocketPayload = {
    type: "updateMessage",
    requestId,
    userId: game.userId ?? "",
    messageId: message.id ?? "",
    patch,
  };
  game.socket.emit(CHANNEL, payload);
  return result;
}

async function handleUpdateRequest(
  payload: Extract<SocketPayload, { type: "updateMessage" }>,
): Promise<void> {
  let ok = false;
  try {
    const message = game.messages.get(payload.messageId);
    const uuid = message ? flagActorUuid(message) : null;
    const actor = uuid !== null && uuid !== "" ? await fromUuid(uuid) : null;
    const sender = game.users.get(payload.userId);
    if (message && sender && actor instanceof Actor && actor.testUserPermission(sender, "OWNER")) {
      // Only content and Kedom flags may be patched through the relay.
      const safe: MessagePatch = {};
      if (typeof payload.patch.content === "string") safe.content = payload.patch.content;
      if (payload.patch.flags?.kedom) safe.flags = { kedom: payload.patch.flags.kedom };
      await message.update(safe as Parameters<ChatMessage.Implementation["update"]>[0]);
      ok = true;
    }
  } catch (err) {
    console.error("Kedom | relayed message update failed", err);
  }
  const reply: SocketPayload = { type: "updateMessageResult", requestId: payload.requestId, ok };
  game.socket.emit(CHANNEL, reply);
}

export function registerMessageSocket(): void {
  game.socket.on(CHANNEL, (payload: SocketPayload) => {
    if (payload.type === "updateMessageResult") {
      pending.get(payload.requestId)?.(payload.ok);
      pending.delete(payload.requestId);
      return;
    }
    if (game.users.activeGM?.isSelf === true) void handleUpdateRequest(payload);
  });
}
