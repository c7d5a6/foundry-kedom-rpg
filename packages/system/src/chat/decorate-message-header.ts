/**
 * PF2e-inspired chat header: character artwork + player name beside the character alias.
 * Artwork fills the portrait column and fades into the flavor row.
 */

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

  const image = document.createElement("img");
  image.alt = actor.name;
  image.src = actor.img;
  image.inert = true;

  const portrait = document.createElement("div");
  portrait.classList.add("kedom-chat-portrait", "portrait", "actor-image");
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
