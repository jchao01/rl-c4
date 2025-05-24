"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Calendar, Trophy } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { format } from "date-fns";

export default function GameHistoryPage() {
	const { data: gameHistory, isLoading } =
		api.connect4.getGameHistory.useQuery();

	const getWinnerDisplay = (winner: string | null, status: string) => {
		if (status === "draw") return "Draw";
		if (winner === "player") return "You Won! 🎉";
		if (winner === "ai") return "AI Won 🤖";
		return "Unknown";
	};

	const getWinnerColor = (winner: string | null, status: string) => {
		if (status === "draw") return "bg-yellow-500";
		if (winner === "player") return "bg-green-500";
		if (winner === "ai") return "bg-red-500";
		return "bg-gray-500";
	};

	const getDuration = (startTime: Date, endTime: Date | null) => {
		if (!endTime) return "N/A";
		const durationMs = endTime.getTime() - startTime.getTime();
		const minutes = Math.floor(durationMs / 60000);
		const seconds = Math.floor((durationMs % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
				<div className="text-lg">Loading game history...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
			<div className="max-w-4xl mx-auto">
				<Card className="shadow-xl">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-3xl font-bold text-gray-800">
								Game History
							</CardTitle>
							<Link href="/">
								<Button variant="outline" className="flex items-center gap-2">
									<ArrowLeft className="w-4 h-4" />
									Back to Game
								</Button>
							</Link>
						</div>
					</CardHeader>

					<CardContent>
						{!gameHistory || gameHistory.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								No completed games yet. Play some games to see them here!
							</div>
						) : (
							<div className="space-y-4">
								{gameHistory.map((game) => (
									<Card
										key={game.id}
										className="hover:shadow-lg transition-shadow"
									>
										<CardContent className="p-4">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-4">
													<Trophy className="w-8 h-8 text-gray-400" />
													<div>
														<div className="flex items-center gap-2 mb-1">
															<Badge
																className={`${getWinnerColor(
																	game.winner,
																	game.status,
																)} text-white`}
															>
																{getWinnerDisplay(game.winner, game.status)}
															</Badge>
															<span className="text-sm text-gray-500">
																{game.moves.length} moves
															</span>
														</div>
														<div className="flex items-center gap-4 text-sm text-gray-600">
															<div className="flex items-center gap-1">
																<Calendar className="w-4 h-4" />
																{format(
																	new Date(game.createdAt),
																	"MMM d, yyyy h:mm a",
																)}
															</div>
															<div>
																Duration:{" "}
																{getDuration(
																	new Date(game.createdAt),
																	game.endedAt ? new Date(game.endedAt) : null,
																)}
															</div>
														</div>
													</div>
												</div>
												<Link href={`/history/${game.id}`}>
													<Button
														variant="outline"
														size="sm"
														className="flex items-center gap-2"
													>
														<Play className="w-4 h-4" />
														Replay
													</Button>
												</Link>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
