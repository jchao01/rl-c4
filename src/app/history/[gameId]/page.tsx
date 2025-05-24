"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	SkipBack,
	SkipForward,
	ChevronLeft,
	ChevronRight,
	Play,
	Pause,
	User,
	Bot,
} from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GameBoard } from "@/components/GameBoard";
import {
	createEmptyBoard,
	ROWS,
	COLS,
	type Player,
	type Board,
} from "@/lib/game-utils";

export default function GameReplayPage() {
	const params = useParams();
	const gameId = params.gameId as string;

	const { data: gameSession, isLoading } = api.connect4.getGameSession.useQuery(
		{
			gameId,
		},
	);

	const [board, setBoard] = useState<Board>(createEmptyBoard());
	const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
	const [isPlaying, setIsPlaying] = useState(false);

	// Apply moves up to the specified index
	const applyMovesToIndex = useCallback(
		(index: number) => {
			if (!gameSession?.moves) return;

			const newBoard = createEmptyBoard();

			for (let i = 0; i <= index && i < gameSession.moves.length; i++) {
				const move = gameSession.moves[i];
				if (move && move.row < ROWS && move.column < COLS) {
					const row = newBoard[move.row];
					if (row) {
						row[move.column] = move.player as Player;
					}
				}
			}

			setBoard(newBoard);
		},
		[gameSession],
	);

	// Auto-play functionality
	useEffect(() => {
		if (!isPlaying || !gameSession?.moves) return;

		if (currentMoveIndex >= gameSession.moves.length - 1) {
			setIsPlaying(false);
			return;
		}

		const timer = setTimeout(() => {
			setCurrentMoveIndex((prev) => prev + 1);
		}, 800);

		return () => clearTimeout(timer);
	}, [isPlaying, currentMoveIndex, gameSession]);

	// Apply moves when index changes
	useEffect(() => {
		applyMovesToIndex(currentMoveIndex);
	}, [currentMoveIndex, applyMovesToIndex]);

	const goToStart = () => {
		setCurrentMoveIndex(-1);
		setIsPlaying(false);
	};

	const goToEnd = () => {
		if (!gameSession?.moves) return;
		setCurrentMoveIndex(gameSession.moves.length - 1);
		setIsPlaying(false);
	};

	const previousMove = () => {
		setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
		setIsPlaying(false);
	};

	const nextMove = () => {
		if (!gameSession?.moves) return;
		setCurrentMoveIndex((prev) =>
			Math.min(gameSession.moves.length - 1, prev + 1),
		);
		setIsPlaying(false);
	};

	const togglePlayPause = () => {
		if (!gameSession?.moves) return;
		if (currentMoveIndex >= gameSession.moves.length - 1) {
			setCurrentMoveIndex(-1);
		}
		setIsPlaying(!isPlaying);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
				<div className="text-lg">Loading game replay...</div>
			</div>
		);
	}

	if (!gameSession) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
				<div className="text-lg">Game not found</div>
			</div>
		);
	}

	const getCurrentPlayer = () => {
		if (currentMoveIndex < 0) return null;
		const move = gameSession.moves[currentMoveIndex];
		return move?.player;
	};

	const getStatusMessage = () => {
		if (currentMoveIndex < 0) return "Start of game";
		if (currentMoveIndex >= gameSession.moves.length - 1) {
			if (gameSession.status === "player-wins") return "You won! 🎉";
			if (gameSession.status === "ai-wins") return "AI won! 🤖";
			if (gameSession.status === "draw") return "It's a draw! 🤝";
		}
		const currentPlayer = getCurrentPlayer();
		return currentPlayer === "player" ? "Your move" : "AI's move";
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
			<div className="max-w-2xl mx-auto">
				<Card className="shadow-xl">
					<CardHeader>
						<div className="flex items-center justify-between mb-4">
							<CardTitle className="text-3xl font-bold text-gray-800">
								Game Replay
							</CardTitle>
							<Link href="/history">
								<Button variant="outline" className="flex items-center gap-2">
									<ArrowLeft className="w-4 h-4" />
									Back to History
								</Button>
							</Link>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<User className="w-5 h-5 text-blue-600" />
								<span className="font-medium">You</span>
							</div>
							<div className="flex flex-col items-center">
								<Badge className="bg-blue-500 text-white px-4 py-2 mb-2">
									{getStatusMessage()}
								</Badge>
								<span className="text-sm text-gray-600">
									Move {currentMoveIndex + 1} of {gameSession.moves.length}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Bot className="w-5 h-5 text-purple-600" />
								<span className="font-medium">AI</span>
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-4">
						{/* Game Board */}
						<GameBoard board={board} />

						{/* Replay Controls */}
						<div className="flex items-center justify-center gap-2">
							<Button
								onClick={goToStart}
								variant="outline"
								size="icon"
								disabled={currentMoveIndex <= -1}
							>
								<SkipBack className="w-4 h-4" />
							</Button>
							<Button
								onClick={previousMove}
								variant="outline"
								size="icon"
								disabled={currentMoveIndex <= -1}
							>
								<ChevronLeft className="w-4 h-4" />
							</Button>
							<Button
								onClick={togglePlayPause}
								variant="default"
								size="icon"
								className="w-12 h-12"
							>
								{isPlaying ? (
									<Pause className="w-5 h-5" />
								) : (
									<Play className="w-5 h-5" />
								)}
							</Button>
							<Button
								onClick={nextMove}
								variant="outline"
								size="icon"
								disabled={currentMoveIndex >= gameSession.moves.length - 1}
							>
								<ChevronRight className="w-4 h-4" />
							</Button>
							<Button
								onClick={goToEnd}
								variant="outline"
								size="icon"
								disabled={currentMoveIndex >= gameSession.moves.length - 1}
							>
								<SkipForward className="w-4 h-4" />
							</Button>
						</div>

						{/* Move List */}
						<div className="mt-6">
							<h3 className="font-semibold mb-2">Move History</h3>
							<div className="max-h-40 overflow-y-auto border rounded-lg p-2">
								{gameSession.moves.map((move: any, index: number) => (
									<button
										type="button"
										key={move.id}
										onClick={() => setCurrentMoveIndex(index)}
										className={`block w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
											index === currentMoveIndex ? "bg-blue-100" : ""
										}`}
									>
										<span className="text-sm">
											{index + 1}. {move.player === "player" ? "You" : "AI"} -
											Column {move.column + 1}
										</span>
									</button>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
