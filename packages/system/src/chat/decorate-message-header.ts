/**
 * PF2e-inspired chat header: actor/token portrait + player name beside the character alias.
 * Tall / scaled art fades toward the flavor text so it does not obscure the check title.
 */

function isDefaultTokenImage(src: string | null | undefined): boolean {
  if (!src) return true;
  return src === CONST.DEFAULT_TOKEN || src.endsWith(CONST.DEFAULT_TOKEN);
}

function resolvePortrait(actor: Actor.Implementation, message: ChatMessage.Implementation): {
  imageUrl: string;
  scale: number;
  usedToken: boolean;
} {
  const token = message.token ?? actor.prototypeToken;
  const tokenImage = token?.texture?.src ?? null;
  const hasTokenImage =
    !!tokenImage && foundry.helpers.media.ImageHelper.hasImageExtension(tokenImage);

  if (!hasTokenImage || isDefaultTokenImage(tokenImage)) {
    return { imageUrl: actor.img, scale: 1, usedToken: false };
  }

  const scale = Math.max(1, token?.texture?.scaleX ?? 1);
  return { imageUrl: tokenImage, scale, usedToken: true };
}

/** Attach portrait + author name to an IC message header (idempotent). */
export function decorateChatMessageHeader(
  message: ChatMessage.Implementation,
  html: HTMLElement,
): void {
  const header = html.querySelector("header.message-header");
  if (!(header instanceof HTMLElement)) return;
  if (header.querySelector(".kedom-chat-portrait")) return;

  const isOOC = message.style === CONST.CHAT_MESSAGE_STYLES.OOC;
  const actor = message.speakerActor;
  if (isOOC || !actor || !message.isContentVisible) return;

  const { imageUrl, scale, usedToken } = resolvePortrait(actor, message);

  const image = document.createElement("img");
  image.alt = actor.name;
  image.src = imageUrl;
  image.inert = true;
  if (scale !== 1) image.style.transform = `scale(${String(scale)})`;

  // Scaled token art overflows the portrait box toward name/flavor — soften edges.
  if (scale > 1.2) {
    const ringPercent = 100 - Math.floor(((scale - 0.7) / scale) * 100);
    const limitPercent = 100 - Math.floor(((scale - 1.15) / scale) * 100);
    image.style.maskImage = `radial-gradient(circle at center, black ${String(ringPercent)}%, rgba(0, 0, 0, 0.2) ${String(limitPercent)}%)`;
  }

  const portrait = document.createElement("div");
  portrait.classList.add(
    "kedom-chat-portrait",
    "portrait",
    usedToken ? "token" : "actor-image",
  );
  portrait.append(image);
  header.prepend(portrait);
  header.classList.add("with-image");

  if (message.author && !header.querySelector(".kedom-chat-user")) {
    const user = document.createElement("span");
    user.classList.add("kedom-chat-user", "user");
    user.textContent = message.author.name;
    header.append(user);
  }
}
