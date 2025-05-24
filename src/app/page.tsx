"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, User, Bot } from "lucide-react";
import { api } from "@/trpc/react";

type Player = "player" | "ai" | null;
type Board = Player[][];
type GameStatus = "playing" | "player-wins" | "ai-wins" | "draw";

const ROWS = 6;
const COLS = 7;

function createEmptyBoard(): Board {
	return Array(ROWS)
		.fill(null)
		.map(() => Array(COLS).fill(null));
}

function checkWin(
	board: Board,
	row: number,
	col: number,
	player: Player,
): boolean {
	if (!player) return false;

	const directions = [
		[0, 1], // horizontal
		[1, 0], // vertical
		[1, 1], // diagonal /
		[1, -1], // diagonal \
	];

	for (const [dx, dy] of directions) {
		let count = 1;

		// Check positive direction
		for (let i = 1; i < 4; i++) {
			const newRow = row + dx * i;
			const newCol = col + dy * i;
			if (
				newRow >= 0 &&
				newRow < ROWS &&
				newCol >= 0 &&
				newCol < COLS &&
				board[newRow]?.[newCol] === player
			) {
				count++;
			} else {
				break;
			}
		}

		// Check negative direction
		for (let i = 1; i < 4; i++) {
			const newRow = row - dx * i;
			const newCol = col - dy * i;
			if (
				newRow >= 0 &&
				newRow < ROWS &&
				newCol >= 0 &&
				newCol < COLS &&
				board[newRow]?.[newCol] === player
			) {
				count++;
			} else {
				break;
			}
		}

		if (count >= 4) return true;
	}

	return false;
}

function isBoardFull(board: Board): boolean {
	return board[0]?.every((cell) => cell !== null) ?? false;
}

export default function Connect4Game() {
	const [board, setBoard] = useState<Board>(createEmptyBoard());
	const [currentPlayer, setCurrentPlayer] = useState<Player>("player");
	const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
	const [isAiThinking, setIsAiThinking] = useState(false);

	const getAIMoveApi = api.connect4.getAIMove.useMutation();

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
								newBoard[row]![result.column] = "ai";

								if (checkWin(newBoard, row, result.column, "ai")) {
									setGameStatus("ai-wins");
								} else if (isBoardFull(newBoard)) {
									setGameStatus("draw");
								} else {
									setCurrentPlayer("player");
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

					setBoard((prevBoard) => {
						const newBoard = prevBoard.map((row) => [...row]);

						for (let row = ROWS - 1; row >= 0; row--) {
							if (newBoard[row]?.[aiCol] === null) {
								newBoard[row]![aiCol] = "ai";

								if (checkWin(newBoard, row, aiCol, "ai")) {
									setGameStatus("ai-wins");
								} else if (isBoardFull(newBoard)) {
									setGameStatus("draw");
								} else {
									setCurrentPlayer("player");
								}

								setIsAiThinking(false);
								return newBoard;
							}
						}

						setIsAiThinking(false);
						return prevBoard;
					});
				}
			} catch (error) {
				console.error("Error getting AI move:", error);
				// Fall back to random move on error
				const aiCol =
					validColumns[Math.floor(Math.random() * validColumns.length)];

				setBoard((prevBoard) => {
					const newBoard = prevBoard.map((row) => [...row]);

					for (let row = ROWS - 1; row >= 0; row--) {
						if (newBoard[row]?.[aiCol] === null) {
							newBoard[row]![aiCol] = "ai";

							if (checkWin(newBoard, row, aiCol, "ai")) {
								setGameStatus("ai-wins");
							} else if (isBoardFull(newBoard)) {
								setGameStatus("draw");
							} else {
								setCurrentPlayer("player");
							}

							setIsAiThinking(false);
							return newBoard;
						}
					}

					setIsAiThinking(false);
					return prevBoard;
				});
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
						newBoard[row]![col] = "player";

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
	};

	const getStatusMessage = () => {
		switch (gameStatus) {
			case "player-wins":
				return "You win! 🎉";
			case "ai-wins":
				return "AI wins! 🤖";
			case "draw":
				return "It's a draw! 🤝";
			case "playing":
				if (isAiThinking) return "AI is thinking...";
				return currentPlayer === "player" ? "Your turn" : "AI's turn";
			default:
				return "";
		}
	};

	const getStatusColor = () => {
		switch (gameStatus) {
			case "player-wins":
				return "bg-green-400";
			case "ai-wins":
				return "bg-red-500";
			case "draw":
				return "bg-yellow-500";
			default:
				return currentPlayer === "player" ? "bg-blue-500" : "bg-purple-500";
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
			<div className="max-w-2xl mx-auto">
				<Card className="shadow-xl">
					<CardHeader className="text-center">
						<CardTitle className="text-3xl font-bold text-gray-800 mb-4">
							Connect 4
						</CardTitle>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<User className="w-5 h-5 text-blue-600" />
								<span className="font-medium">You</span>
							</div>
							<Badge className={`${getStatusColor()} text-white px-4 py-2`}>
								{getStatusMessage()}
							</Badge>
							<div className="flex items-center gap-2">
								<Bot className="w-5 h-5 text-purple-600" />
								<span className="font-medium">AI</span>
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-4">
						{/* Game Board */}
						<div className="bg-blue-600 p-4 rounded-lg shadow-inner">
							<div className="grid grid-cols-7 gap-2">
								{Array.from({ length: COLS }, (_, col) => (
									<button
										type="button"
										key={col}
										onClick={() => dropPiece(col)}
										disabled={
											gameStatus !== "playing" ||
											currentPlayer !== "player" ||
											isAiThinking ||
											board[0]?.[col] !== null
										}
										className="h-8 bg-blue-500 hover:bg-blue-400 disabled:hover:bg-blue-500 rounded transition-colors duration-200 border-2 border-blue-400"
										aria-label={`Drop piece in column ${col + 1}`}
									/>
								))}
							</div>

							<div className="grid grid-cols-7 gap-2 mt-2">
								{board.map((row, rowIndex) =>
									row.map((cell, colIndex) => (
										<div
											key={`${rowIndex}-${colIndex}`}
											className="w-12 h-12 bg-white rounded-full border-2 border-blue-300 flex items-center justify-center shadow-inner"
										>
											{cell && (
												<div
													className={`w-10 h-10 rounded-full shadow-lg ${
														cell === "player"
															? "bg-gradient-to-br from-red-600 to-red-800"
															: "bg-gradient-to-br from-yellow-400 to-yellow-600"
													}`}
												/>
											)}
										</div>
									)),
								)}
							</div>
						</div>

						{/* Game Controls */}
						<div className="flex justify-center">
							<Button
								onClick={resetGame}
								variant="outline"
								className="flex items-center gap-2"
							>
								<RotateCcw className="w-4 h-4" />
								New Game
							</Button>
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
