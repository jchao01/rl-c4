export type Player = "player" | "ai" | null;
export type Board = Player[][];
export type GameStatus = "playing" | "player-wins" | "ai-wins" | "draw";

export const ROWS = 6;
export const COLS = 7;

export function createEmptyBoard(): Board {
	return Array(ROWS)
		.fill(null)
		.map(() => Array(COLS).fill(null));
}

export function checkWin(
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

	for (const direction of directions) {
		const dx = direction[0];
		const dy = direction[1];
		if (dx === undefined || dy === undefined) continue;
		
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

export function isBoardFull(board: Board): boolean {
	return board[0]?.every((cell) => cell !== null) ?? false;
}

export function getWinnerDisplay(winner: string | null, status: string): string {
	if (status === "draw") return "Draw";
	if (winner === "player") return "You Won! 🎉";
	if (winner === "ai") return "AI Won 🤖";
	return "Unknown";
}

export function getWinnerColor(winner: string | null, status: string): string {
	if (status === "draw") return "bg-yellow-500";
	if (winner === "player") return "bg-green-500";
	if (winner === "ai") return "bg-red-500";
	return "bg-gray-500";
}

export function getStatusMessage(status: GameStatus, currentPlayer: Player, isAiThinking: boolean): string {
	switch (status) {
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
}

export function getStatusColor(status: GameStatus, currentPlayer: Player): string {
	switch (status) {
		case "player-wins":
			return "bg-green-400";
		case "ai-wins":
			return "bg-red-500";
		case "draw":
			return "bg-yellow-500";
		default:
			return currentPlayer === "player" ? "bg-blue-500" : "bg-purple-500";
	}
} 