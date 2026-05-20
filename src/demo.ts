import type { CommandContext, CommandDefinition } from "./types";

export const echoCommand: CommandDefinition = {
  name: "Echo",
  description: "Echoes back your message",
  usage: ".echo [text]",
  async handle(ctx: CommandContext) {
    const text = ctx.args.join(" ") || "You didn't say anything!";
    await ctx.send(text);
  },
};

export const remindCommand: CommandDefinition = {
  name: "Remind Me",
  description: "Set a reminder with a delay (e.g. 10m, 2h, 30s)",
  usage: ".remind me [duration] [message]",
  async handle(ctx: CommandContext) {
    const [duration, ...messageParts] = ctx.args;

    if (!duration) {
      await ctx.send("Usage: *.remind me [duration] [message]*\nExample: _.remind me 10m check email_");
      return;
    }

    const message = messageParts.join(" ") || "Time's up!";

    try {
      await ctx.schedule(duration, async () => {
        await ctx.send(`⏰ *Reminder:* ${message}`);
      });
      await ctx.send(`✅ I'll remind you in ${duration}: "${message}"`);
    } catch (error) {
      await ctx.send(`Failed to set reminder. Make sure the duration format is correct (e.g. 10m, 2h, 30s).`);
    }
  },
};

export const translateCommand: CommandDefinition = {
  name: "Translate",
  description: "Translate text (stub - connect to your translation API)",
  usage: ".translate [text] [language]",
  async handle(ctx: CommandContext) {
    const text = ctx.args.slice(0, -1).join(" ");
    const language = ctx.args[ctx.args.length - 1];

    if (!text || !language) {
      await ctx.send("Usage: *.translate [text] [language]*\nExample: _.translate hello world spanish_");
      return;
    }

    await ctx.send(`🔤 Translating "${text}" to ${language}...\n\n_This is a demo. Connect a translation API for real functionality._`);
  },
};

export const demoCommands: Record<string, CommandDefinition> = {
  echo: echoCommand,
  "remind me": remindCommand,
  translate: translateCommand,
};