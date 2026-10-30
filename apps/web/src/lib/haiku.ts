// Why write it down: one of these greets every sign-in. Each is 5-7-5.
export const HAIKU: [string, string, string][] = [
  ["A mind full of tasks", "is a cup that cannot pour.", "Write them. Drink the day."],
  ["Small box, one small tick.", "The mountain does not move, but", "you are higher now."],
  ["Today is a page.", "Write what matters at the top.", "Let the rest blow by."],
  ["Plans held in the head", "are leaves on a windy day.", "Paper is the stone."],
  ["Each tick is a bell.", "Small sound, but the whole day hears:", "something got finished."],
  ["The long road begins", "with a line you can cross out.", "Write the first step down."],
  ["Remembering costs.", "Forgetting costs even more.", "A list costs nothing."],
  ["You cannot do all.", "You can do the next small thing.", "That is the whole trick."],
  ["Busy is not done.", "The list knows the difference.", "Ask it what is left."],
  ["Name the thing you fear", "and it shrinks to fit a line.", "Then you tick it off."],
  ["Morning, empty page.", "Evening, a column of ticks.", "Proof the day was yours."],
];

// A different one each time it's called (each sign-in page load).
export const pickHaiku = () => HAIKU[Math.floor(Math.random() * HAIKU.length)];
