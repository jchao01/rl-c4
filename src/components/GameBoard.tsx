import { COLS } from "@/lib/game-utils";
import type { Board } from "@/lib/game-utils";

interface GameBoardProps {
	board: Board;
	onColumnClick?: (col: number) => void;
	isPlayable?: boolean;
	disabledColumns?: boolean[];
}

export function GameBoard({
	board,
	onColumnClick,
	isPlayable = false,
	disabledColumns = [],
}: GameBoardProps) {
	return (
		<div className="bg-blue-600 p-4 rounded-lg shadow-inner">
			{/* Column buttons - only show if playable */}
			{isPlayable && onColumnClick && (
				<div className="grid grid-cols-7 gap-2 mb-2">
					{Array.from({ length: COLS }, (_, col) => (
						<button
							type="button"
							key={`drop-col-${col}`}
							onClick={() => onColumnClick(col)}
							disabled={disabledColumns[col]}
							className="h-8 bg-blue-500 hover:bg-blue-400 disabled:hover:bg-blue-500 rounded transition-colors duration-200 border-2 border-blue-400"
							aria-label={`Drop piece in column ${col + 1}`}
						/>
					))}
				</div>
			)}

			{/* Game board cells */}
			<div className="grid grid-cols-7 gap-2">
				{board.map((row, rowIndex) =>
					row.map((cell, colIndex) => (
						<div
							key={`board-${rowIndex}-${colIndex}`}
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
	);
}
