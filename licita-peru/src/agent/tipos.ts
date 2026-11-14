// Alias de los tipos del SDK que usa el agente (superficie beta de mensajes).
import type Anthropic from "@anthropic-ai/sdk";

export type BetaMessage = Anthropic.Beta.Messages.BetaMessage;
export type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam;
export type BetaTextBlockParam = Anthropic.Beta.Messages.BetaTextBlockParam;
export type BetaImageBlockParam = Anthropic.Beta.Messages.BetaImageBlockParam;
export type BetaRequestDocumentBlock = Anthropic.Beta.Messages.BetaRequestDocumentBlock;
export type BetaToolUnion = Anthropic.Beta.Messages.BetaToolUnion;
export type BetaToolInputSchema = Anthropic.Beta.Messages.BetaTool.InputSchema;
