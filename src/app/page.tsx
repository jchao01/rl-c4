"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, History } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { GameBoard } from "@/components/GameBoard";
import { GameHeader } from "@/components/GameHeader";
import {
	createEmptyBoard,
	checkWin,
	isBoardFull,
	ROWS,
	COLS,
	type Player,
	type Board,
	type GameStatus,
} from "@/lib/game-utils";

export default function Connect4Game() {
	const [board, setBoard] = useState<Board>(createEmptyBoard());
	const [currentPlayer, setCurrentPlayer] = useState<Player>("player");
	const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
	const [isAiThinking, setIsAiThinking] = useState(false);
	const [moveHistory, setMoveHistory] = useState<
		Array<{
			player: Player;
			column: number;
			row: number;
			moveNumber: number;
		}>
	>([]);
	const gameSavedRef = useRef(false);

	const getAIMoveApi = api.connect4.getAIMove.useMutation();
	const createGameSessionApi = api.connect4.createGameSession.useMutation();
	const saveMovesBatchApi = api.connect4.saveMovesBatch.useMutation();
	const endGameSessionApi = api.connect4.endGameSession.useMutation();
	const utils = api.useUtils();

	// Save the completed game to the database
	const saveCompletedGame = useCallback(
		async (finalStatus: GameStatus, moves: typeof moveHistory) => {
			if (finalStatus === "playing" || moves.length === 0) return;

			// Prevent saving the same game multiple times
			if (gameSavedRef.current) return;
			gameSavedRef.current = true;

			try {
				console.log("Saving completed game...");

				// Create a new game session
				const session = await createGameSessionApi.mutateAsync();

				// Save all moves in batch - single server call
				const validMoves = moves.filter((move) => move.player !== null);
				if (validMoves.length > 0) {
					await saveMovesBatchApi.mutateAsync({
						gameId: session.id,
						moves: validMoves.map((move) => ({
							player: move.player as "player" | "ai",
							column: move.column,
							row: move.row,
							moveNumber: move.moveNumber,
						})),
					});
				}

				// End the game session with the final status
				await endGameSessionApi.mutateAsync({
					gameId: session.id,
					status: finalStatus,
				});

				// Invalidate game history query to show the new game
				await utils.connect4.getGameHistory.invalidate();

				console.log("Game saved successfully!");
			} catch (error) {
				console.error("Failed to save game:", error);
				// Reset the flag if save failed so it can be retried
				gameSavedRef.current = false;
			}
		},
		[createGameSessionApi, saveMovesBatchApi, endGameSessionApi, utils],
	);

	// Effect to save game when it ends
	useEffect(() => {
		if (
			gameStatus !== "playing" &&
			!gameSavedRef.current &&
			moveHistory.length > 0
		) {
			saveCompletedGame(gameStatus, moveHistory);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gameStatus]); // Only depend on gameStatus to avoid infinite loop

	const makeAiMove = useCallback(
		async (currentBoard: Board) => {
			// Get valid columns
			const validColumns = [];
			for (let col = 0; col < COLS; col++) {
				if (currentBoard[0]?.[col] === null) {
					validColumns.push(col);
				}
			}

			if (validColumns.length === 0) {
				setIsAiThinking(false);
				return;
			}

			try {
				// Convert board to the format expected by the API (0 = empty, 1 = player, 2 = AI)
				const apiBoard = currentBoard.map((row) =>
					row.map((cell) => (cell === null ? 0 : cell === "player" ? 1 : 2)),
				);

				// Call the AI API
				const result = await getAIMoveApi.mutateAsync({
					board: apiBoard,
					currentPlayer: 2, // AI is player 2
					validColumns: validColumns,
				});

				if (
					result.success &&
					result.column !== null &&
					validColumns.includes(result.column)
				) {
					// Apply the AI move
					setBoard((prevBoard) => {
						const newBoard = prevBoard.map((row) => [...row]);

						for (let row = ROWS - 1; row >= 0; row--) {
							if (newBoard[row]?.[result.column] === null) {
								const currentRow = newBoard[row];
								if (currentRow) {
									currentRow[result.column] = "ai";

									// Track the AI move locally
									setMoveHistory((prev) => [
										...prev,
										{
											player: "ai",
											column: result.column,
											row: row,
											moveNumber: prev.length,
										},
									]);

									if (checkWin(newBoard, row, result.column, "ai")) {
										setGameStatus("ai-wins");
									} else if (isBoardFull(newBoard)) {
										setGameStatus("draw");
									} else {
										setCurrentPlayer("player");
									}
								}

								setIsAiThinking(false);
								return newBoard;
							}
						}

						setIsAiThinking(false);
						return prevBoard;
					});
				} else {
					// Fall back to random move if AI fails
					console.error(
						"AI failed to provide a valid move, using random fallback",
					);
					const aiCol =
						validColumns[Math.floor(Math.random() * validColumns.length)];

					if (aiCol !== undefined) {
						setBoard((prevBoard) => {
							const newBoard = prevBoard.map((row) => [...row]);

							for (let row = ROWS - 1; row >= 0; row--) {
								if (newBoard[row]?.[aiCol] === null) {
									const currentRow = newBoard[row];
									if (currentRow) {
										currentRow[aiCol] = "ai";

										// Track the AI move locally
										setMoveHistory((prev) => [
											...prev,
											{
												player: "ai",
												column: aiCol,
												row: row,
												moveNumber: prev.length,
											},
										]);

										if (checkWin(newBoard, row, aiCol, "ai")) {
											setGameStatus("ai-wins");
										} else if (isBoardFull(newBoard)) {
											setGameStatus("draw");
										} else {
											setCurrentPlayer("player");
										}
									}

									setIsAiThinking(false);
									return newBoard;
								}
							}

							setIsAiThinking(false);
							return prevBoard;
						});
					}
				}
			} catch (error) {
				console.error("Error getting AI move:", error);
				// Fall back to random move on error
				const aiCol =
					validColumns[Math.floor(Math.random() * validColumns.length)];

				if (aiCol !== undefined) {
					setBoard((prevBoard) => {
						const newBoard = prevBoard.map((row) => [...row]);

						for (let row = ROWS - 1; row >= 0; row--) {
							if (newBoard[row]?.[aiCol] === null) {
								const currentRow = newBoard[row];
								if (currentRow) {
									currentRow[aiCol] = "ai";

									// Track the AI move locally
									setMoveHistory((prev) => [
										...prev,
										{
											player: "ai",
											column: aiCol,
											row: row,
											moveNumber: prev.length,
										},
									]);

									if (checkWin(newBoard, row, aiCol, "ai")) {
										setGameStatus("ai-wins");
									} else if (isBoardFull(newBoard)) {
										setGameStatus("draw");
									} else {
										setCurrentPlayer("player");
									}
								}

								setIsAiThinking(false);
								return newBoard;
							}
						}

						setIsAiThinking(false);
						return prevBoard;
					});
				}
			}
		},
		[getAIMoveApi],
	);

	// Effect to trigger AI moves when it becomes AI's turn
	useEffect(() => {
		if (currentPlayer === "ai" && gameStatus === "playing" && !isAiThinking) {
			const handleAITurn = async () => {
				setIsAiThinking(true);
				// Small delay for UX
				await new Promise((resolve) => setTimeout(resolve, 1000));
				await makeAiMove(board);
			};
			handleAITurn();
		}
	}, [currentPlayer, gameStatus, isAiThinking, board, makeAiMove]);

	const dropPiece = useCallback(
		(col: number) => {
			if (
				gameStatus !== "playing" ||
				currentPlayer !== "player" ||
				isAiThinking
			)
				return;

			setBoard((prevBoard) => {
				const newBoard = prevBoard.map((row) => [...row]);

				// Find the lowest empty row in the column
				for (let row = ROWS - 1; row >= 0; row--) {
					if (newBoard[row]?.[col] === null) {
						const currentRow = newBoard[row];
						if (currentRow) {
							currentRow[col] = "player";

							// Track the player move locally
							setMoveHistory((prev) => [
								...prev,
								{
									player: "player",
									column: col,
									row: row,
									moveNumber: prev.length,
								},
							]);

							// Check for win
							if (checkWin(newBoard, row, col, "player")) {
								setGameStatus("player-wins");
								return newBoard;
							}

							// Check for draw
							if (isBoardFull(newBoard)) {
								setGameStatus("draw");
								return newBoard;
							}

							// Switch to AI turn
							setCurrentPlayer("ai");
						}

						return newBoard;
					}
				}

				return prevBoard; // Column is full
			});
		},
		[gameStatus, currentPlayer, isAiThinking],
	);

	const resetGame = () => {
		setBoard(createEmptyBoard());
		setCurrentPlayer("player");
		setGameStatus("playing");
		setIsAiThinking(false);
		setMoveHistory([]);
		gameSavedRef.current = false; // Reset the save flag for new game
	};

	// Check which columns are full
	const disabledColumns = board[0]?.map((cell) => cell !== null) ?? [];

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
			<div className="max-w-2xl mx-auto">
				<Card className="shadow-xl">
					<CardHeader className="text-center">
						<CardTitle className="text-3xl font-bold text-gray-800 mb-4">
							Connect 4
						</CardTitle>
						<GameHeader
							gameStatus={gameStatus}
							currentPlayer={currentPlayer}
							isAiThinking={isAiThinking}
						/>
					</CardHeader>

					<CardContent className="space-y-4">
						{/* Game Board */}
						<GameBoard
							board={board}
							onColumnClick={dropPiece}
							isPlayable={
								gameStatus === "playing" &&
								currentPlayer === "player" &&
								!isAiThinking
							}
							disabledColumns={disabledColumns}
						/>

						{/* Game Controls */}
						<div className="flex justify-center gap-4">
							<Button
								onClick={resetGame}
								variant="outline"
								className="flex items-center gap-2"
							>
								<RotateCcw className="w-4 h-4" />
								New Game
							</Button>
							<Link href="/history">
								<Button variant="outline" className="flex items-center gap-2">
									<History className="w-4 h-4" />
									Game History
								</Button>
							</Link>
						</div>

						{/* Game Instructions */}
						<div className="text-sm text-gray-600 text-center space-y-1">
							<p>Click on a column to drop your piece (red)</p>
							<p>Get 4 in a row to win!</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
