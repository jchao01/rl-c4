import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

// Types
type Player = 1 | 2;
type BoardCell = 0 | 1 | 2; // 0 = empty, 1 = Player 1 (X), 2 = Player 2 (O)
type Board = BoardCell[][];

interface ModelResponse {
  response: string;
  success: boolean;
  error?: string;
}

// Load the prompt from file
import { readFileSync } from "node:fs";
import { join } from "node:path";

const getConnect4Prompt = (): string => {
  try {
    return readFileSync(join(process.cwd(), "src/server/connect4_prompt.txt"), "utf-8");
  } catch (error) {
    throw new Error("Failed to load prompt file");
  }
};

// Get text representation of the board
const getBoardTextRepresentation = (board: Board, currentPlayer: Player): string => {
  const symbols = { 0: '.', 1: 'X', 2: 'O' } as const;
  const lines: string[] = [];

  // Column numbers
  lines.push(` ${Array.from({ length: 7 }, (_, i) => i).join(' ')}`);
  lines.push('='.repeat(14));

  // Board rows
  for (const row of board) {
    const line = `|${row.map(cell => symbols[cell]).join('|')}|`;
    lines.push(line);
  }

  lines.push('='.repeat(14));
  lines.push(`Player ${currentPlayer}'s Turn (${currentPlayer === 1 ? 'X' : 'O'})`);

  return lines.join('\n');
};

// Parse the column from the AI response
const parseMove = (response: string): number | null => {
  // Try to extract column from XML format
  const columnMatch = response.match(/<column>(\d+)<\/column>/);
  if (columnMatch?.[1]) {
    const column = Number.parseInt(columnMatch[1], 10);
    if (column >= 0 && column <= 6) {
      return column;
    }
  }

  // Fallback: try to find any number 0-6 in the response
  const numbers = response.match(/\b[0-6]\b/g);
  if (numbers?.[0]) {
    return Number.parseInt(numbers[0], 10);
  }

  return null;
};

export const connect4Router = createTRPCRouter({
  // Get AI move for the current board state
  getAIMove: publicProcedure
    .input(z.object({
      board: z.array(z.array(z.union([z.literal(0), z.literal(1), z.literal(2)]))),
      currentPlayer: z.union([z.literal(1), z.literal(2)]),
      validColumns: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
        console.log("Getting AI move");
      const baseUrl = 'https://sandbox10--qwen-connect4-qwenconnect4model-chat-endpoint.modal.run';
      const maxRetries = 10;
      
      const boardState = getBoardTextRepresentation(input.board as Board, input.currentPlayer);
      const prompt = getConnect4Prompt();
      
      const gamePrompt = `Current board state:
${boardState}

Valid columns: [${input.validColumns.join(', ')}]
Your turn as Player ${input.currentPlayer} (${input.currentPlayer === 1 ? 'X' : 'O'})`;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt}/${maxRetries} for AI move`);
          
          const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: gamePrompt,
              system_message: prompt,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: ModelResponse = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Model returned success=false');
          }

          // Parse the move from the response
          const column = parseMove(data.response);
          
          if (column !== null && input.validColumns.includes(column)) {
            console.log(`Valid move found: column ${column}`);
            return {
              success: true,
              column,
              error: null,
            };
          }
          
          console.log(`Invalid move ${column} (valid: [${input.validColumns.join(', ')}]), retrying...`);

        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          
          if (attempt === maxRetries) {
            console.error(`All ${maxRetries} attempts failed`);
            return {
              success: false,
              column: null,
              error: 'AI failed to provide a valid move after all retries',
            };
          }
        }
      }

      return {
        success: false,
        column: null,
        error: 'AI failed to provide a valid move',
      };
    }),
    
  // Create a new game session
  createGameSession: publicProcedure
    .mutation(async () => {
      const session = await db.gameSession.create({
        data: {
          status: "playing",
        },
      });
      
      return session;
    }),
    
  // Save a move
  saveMove: publicProcedure
    .input(z.object({
      gameId: z.string(),
      player: z.enum(["player", "ai"]),
      column: z.number(),
      row: z.number(),
      moveNumber: z.number(),
    }))
    .mutation(async ({ input }) => {
      const move = await db.move.create({
        data: {
          gameId: input.gameId,
          player: input.player,
          column: input.column,
          row: input.row,
          moveNumber: input.moveNumber,
        },
      });
      
      return move;
    }),
    
  // Save multiple moves in batch
  saveMovesBatch: publicProcedure
    .input(z.object({
      gameId: z.string(),
      moves: z.array(z.object({
        player: z.enum(["player", "ai"]),
        column: z.number(),
        row: z.number(),
        moveNumber: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const moves = await db.move.createMany({
        data: input.moves.map(move => ({
          gameId: input.gameId,
          player: move.player,
          column: move.column,
          row: move.row,
          moveNumber: move.moveNumber,
        })),
      });
      
      return moves;
    }),
    
  // End a game session
  endGameSession: publicProcedure
    .input(z.object({
      gameId: z.string(),
      status: z.enum(["player-wins", "ai-wins", "draw"]),
    }))
    .mutation(async ({ input }) => {
      const winner = 
        input.status === "player-wins" ? "player" :
        input.status === "ai-wins" ? "ai" :
        null;
        
      const session = await db.gameSession.update({
        where: { id: input.gameId },
        data: {
          status: input.status,
          winner,
          endedAt: new Date(),
        },
      });
      
      return session;
    }),
    
  // Get game history
  getGameHistory: publicProcedure
    .query(async () => {
      const sessions = await db.gameSession.findMany({
        where: {
          status: {
            not: "playing",
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          moves: {
            orderBy: {
              moveNumber: "asc",
            },
          },
        },
      });
      
      return sessions;
    }),
    
  // Get specific game session
  getGameSession: publicProcedure
    .input(z.object({
      gameId: z.string(),
    }))
    .query(async ({ input }) => {
      const session = await db.gameSession.findUnique({
        where: { id: input.gameId },
        include: {
          moves: {
            orderBy: {
              moveNumber: "asc",
            },
          },
        },
      });
      
      return session;
    }),
}); 