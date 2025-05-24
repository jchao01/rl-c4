import { User, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Player, GameStatus } from "@/lib/game-utils";
import { getStatusMessage, getStatusColor } from "@/lib/game-utils";

interface GameHeaderProps {
	gameStatus: GameStatus;
	currentPlayer: Player;
	isAiThinking: boolean;
}

export function GameHeader({
	gameStatus,
	currentPlayer,
	isAiThinking,
}: GameHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<User className="w-5 h-5 text-blue-600" />
				<span className="font-medium">You</span>
			</div>
			<Badge
				className={`${getStatusColor(gameStatus, currentPlayer)} text-white px-4 py-2`}
			>
				{getStatusMessage(gameStatus, currentPlayer, isAiThinking)}
			</Badge>
			<div className="flex items-center gap-2">
				<Bot className="w-5 h-5 text-purple-600" />
				<span className="font-medium">AI</span>
			</div>
		</div>
	);
}
