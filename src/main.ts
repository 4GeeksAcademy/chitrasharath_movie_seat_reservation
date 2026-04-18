type SeatValue = 0 | 1;
type SeatingMatrix = SeatValue[][];
type SeatCount = 1 | 2;

interface SeatPosition {
  row: number;
  col: number;
}

interface SeatOperationResult {
  success: boolean;
  message: string;
  positions: SeatPosition[];
}

interface SeatCounts {
  occupied: number;
  available: number;
}

const TOTAL_ROWS = 8;
const TOTAL_COLUMNS = 10;

const STAFF_MESSAGES = {
  reservationConfirmed: "RESERVATION CONFIRMED",
  seatAlreadyTaken: "SEAT ALREADY TAKEN",
  adjacentSeatsFound: "ADJACENT SEATS FOUND",
  seatAvailable: "SEAT AVAILABLE",
  invalidRequest: "INVALID REQUEST",
  seatsNotAvailable: "SEATS NOT AVAILABLE"
} as const;

const HELP_TEXT = [
  "Available commands:",
  "  show                      - Display current seat map",
  "  check 1                   - Find first available single seat",
  "  check 2                   - Find first available adjacent pair",
  "  reserve <row> <col> 1     - Reserve one seat at row/column",
  "  reserve <row> <col> 2     - Reserve two adjacent seats from row/column",
  "  counts                    - Show occupied and available totals",
  "  test                      - Run all required scenario tests",
  "  help                      - Show this command list",
  "  exit                      - Quit the program",
  "",
  "Optional mode:",
  "  npm run console -- --test - Run required test scenarios"
].join("\n");

/**
 * Initializes an 8x10 seating matrix.
 * Internal representation uses:
 * - 0 for available
 * - 1 for occupied
 */
function initializeSeatingMatrix(
  rows: number = TOTAL_ROWS,
  columns: number = TOTAL_COLUMNS
): SeatingMatrix {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => 0 as SeatValue)
  );
}

/**
 * Checks availability for 1 seat or 2 adjacent seats in the same row.
 * Returns success and seat positions when found, otherwise failure.
 */
function checkSeatAvailability(
  matrix: SeatingMatrix,
  seatCount: SeatCount
): SeatOperationResult {
  if (seatCount === 1) {
    for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < matrix[rowIndex].length; colIndex += 1) {
        if (matrix[rowIndex][colIndex] === 0) {
          return {
            success: true,
            message: STAFF_MESSAGES.seatAvailable,
            positions: [toSeatPosition(rowIndex, colIndex)]
          };
        }
      }
    }

    return {
      success: false,
      message: STAFF_MESSAGES.seatsNotAvailable,
      positions: []
    };
  }

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < matrix[rowIndex].length - 1; colIndex += 1) {
      const isCurrentAvailable = matrix[rowIndex][colIndex] === 0;
      const isRightAvailable = matrix[rowIndex][colIndex + 1] === 0;

      if (isCurrentAvailable && isRightAvailable) {
        return {
          success: true,
          message: STAFF_MESSAGES.adjacentSeatsFound,
          positions: [
            toSeatPosition(rowIndex, colIndex),
            toSeatPosition(rowIndex, colIndex + 1)
          ]
        };
      }
    }
  }

  return {
    success: false,
    message: STAFF_MESSAGES.seatsNotAvailable,
    positions: []
  };
}

/**
 * Validates and reserves staff-selected seats.
 * - Input coordinates are 1-based.
 * - For seatCount 2, reservation must be adjacent in the same row.
 */
function validateAndReserveSeats(
  matrix: SeatingMatrix,
  row: number,
  col: number,
  seatCount: SeatCount
): SeatOperationResult {
  const totalRows = matrix.length;
  const totalCols = matrix[0]?.length ?? 0;

  if (!isInRange(row, 1, totalRows) || !isInRange(col, 1, totalCols)) {
    return {
      success: false,
      message: STAFF_MESSAGES.invalidRequest,
      positions: []
    };
  }

  const rowIndex = row - 1;
  const colIndex = col - 1;

  if (seatCount === 1) {
    if (matrix[rowIndex][colIndex] === 1) {
      return {
        success: false,
        message: STAFF_MESSAGES.seatAlreadyTaken,
        positions: []
      };
    }

    matrix[rowIndex][colIndex] = 1;
    return {
      success: true,
      message: STAFF_MESSAGES.reservationConfirmed,
      positions: [toSeatPosition(rowIndex, colIndex)]
    };
  }

  const hasRightNeighbor = colIndex + 1 < totalCols;
  if (!hasRightNeighbor) {
    return {
      success: false,
      message: STAFF_MESSAGES.seatsNotAvailable,
      positions: []
    };
  }

  const canReservePair =
    matrix[rowIndex][colIndex] === 0 && matrix[rowIndex][colIndex + 1] === 0;

  if (!canReservePair) {
    return {
      success: false,
      message: STAFF_MESSAGES.seatAlreadyTaken,
      positions: []
    };
  }

  matrix[rowIndex][colIndex] = 1;
  matrix[rowIndex][colIndex + 1] = 1;

  return {
    success: true,
    message: STAFF_MESSAGES.reservationConfirmed,
    positions: [
      toSeatPosition(rowIndex, colIndex),
      toSeatPosition(rowIndex, colIndex + 1)
    ]
  };
}

/**
 * Counts occupied and available seats in the matrix.
 */
function getSeatCounts(matrix: SeatingMatrix): SeatCounts {
  let occupied = 0;
  let available = 0;

  for (const row of matrix) {
    for (const seat of row) {
      if (seat === 1) {
        occupied += 1;
      } else {
        available += 1;
      }
    }
  }

  return { occupied, available };
}

/**
 * Renders a terminal-friendly seat map with row and column labels.
 * - X indicates occupied
 * - L indicates available
 */
function renderSeatMap(matrix: SeatingMatrix): string {
  const totalCols = matrix[0]?.length ?? 0;
  const columnHeader = Array.from({ length: totalCols }, (_, index) =>
    String(index + 1).padStart(2, " ")
  ).join(" ");

  const lines = [`    ${columnHeader}`];

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const rowText = matrix[rowIndex]
      .map((seat) => (seat === 1 ? " X" : " L"))
      .join(" ");
    lines.push(`R${String(rowIndex + 1).padStart(2, "0")} ${rowText}`);
  }

  return lines.join("\n");
}

/**
 * Converts seat coordinate objects into a readable staff-facing string.
 * Example output: `(1, 1), (1, 2)`.
 */
function formatSeatPositions(positions: SeatPosition[]): string {
  if (positions.length === 0) {
    return "none";
  }
  return positions.map((position) => `(${position.row}, ${position.col})`).join(", ");
}

/**
 * Converts internal zero-based row/column indexes into 1-based seat positions.
 */
function toSeatPosition(rowIndex: number, colIndex: number): SeatPosition {
  return { row: rowIndex + 1, col: colIndex + 1 };
}

/**
 * Generic numeric range validator used for row/column bounds checks.
 */
function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Starts the interactive command-line interface for cinema staff.
 * This loop keeps the current seating matrix in memory and processes commands
 * until the user explicitly exits.
 */
async function runCli(): Promise<void> {
  const matrix = initializeSeatingMatrix();
  const readlineModule = await import("node:readline/promises");
  const processModule = await import("node:process");

  const rl = readlineModule.createInterface({
    input: processModule.stdin,
    output: processModule.stdout
  });

  processModule.stdout.write("\nIndependent Cinema Seat Reservation CLI\n");
  processModule.stdout.write("---------------------------------------\n");
  processModule.stdout.write(`${HELP_TEXT}\n\n`);
  processModule.stdout.write(`${renderSeatMap(matrix)}\n\n`);

  try {
    while (true) {
      const rawInput = await rl.question("cinema> ");
      const command = rawInput.trim();

      if (!command) {
        continue;
      }

      const tokens = command.split(/\s+/);
      const action = tokens[0]?.toLowerCase();

      if (action === "exit") {
        processModule.stdout.write("Goodbye.\n");
        break;
      }

      if (action === "help") {
        processModule.stdout.write(`${HELP_TEXT}\n\n`);
        continue;
      }

      if (action === "show") {
        processModule.stdout.write(`${renderSeatMap(matrix)}\n\n`);
        continue;
      }

      if (action === "counts") {
        const counts = getSeatCounts(matrix);
        processModule.stdout.write(
          `Occupied: ${counts.occupied} | Available: ${counts.available}\n\n`
        );
        continue;
      }

      if (action === "test") {
        runScenarioTests();
        processModule.stdout.write("\n");
        continue;
      }

      if (action === "check") {
        const seatCount = parseSeatCount(tokens[1]);
        if (!seatCount || tokens.length !== 2) {
          processModule.stdout.write("Invalid command. Usage: check 1 OR check 2\n\n");
          continue;
        }

        const result = checkSeatAvailability(matrix, seatCount);
        processModule.stdout.write(`${result.message}\n`);
        processModule.stdout.write(`Positions: ${formatSeatPositions(result.positions)}\n\n`);
        continue;
      }

      if (action === "reserve") {
        if (tokens.length !== 4) {
          processModule.stdout.write(
            "Invalid command. Usage: reserve <row> <col> <1|2>\n\n"
          );
          continue;
        }

        const row = Number(tokens[1]);
        const col = Number(tokens[2]);
        const seatCount = parseSeatCount(tokens[3]);

        if (!Number.isInteger(row) || !Number.isInteger(col) || !seatCount) {
          processModule.stdout.write(
            "Invalid command. Row/col must be integers and seat count must be 1 or 2.\n\n"
          );
          continue;
        }

        const result = validateAndReserveSeats(matrix, row, col, seatCount);
        processModule.stdout.write(`${result.message}\n`);
        processModule.stdout.write(`Positions: ${formatSeatPositions(result.positions)}\n`);
        processModule.stdout.write(`${renderSeatMap(matrix)}\n\n`);
        continue;
      }

      processModule.stdout.write("Unknown command. Type 'help' to view available commands.\n\n");
    }
  } finally {
    rl.close();
  }
}

/**
 * Parses a command token into a valid seat count (`1` or `2`).
 * Returns `null` for invalid values.
 */
function parseSeatCount(value: string | undefined): SeatCount | null {
  if (value === "1") {
    return 1;
  }
  if (value === "2") {
    return 2;
  }
  return null;
}

/**
 * Runs the four required scenario tests and prints a pass/fail summary.
 */
function runScenarioTests(): void {
  const failures: string[] = [];

  scenarioEmptyRoom(failures);
  scenarioPartiallyFilledRoom(failures);
  scenarioNearlyFullScatteredSingles(failures);
  scenarioFullRoom(failures);

  if (failures.length > 0) {
    console.error("\nScenario test run failed:\n");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    return;
  }

  console.log("\nAll scenario tests passed.");
}

/**
 * Scenario 1: Empty room (all seats available).
 * Verifies first available single seat, first adjacent pair, and seat counts.
 */
function scenarioEmptyRoom(failures: string[]): void {
  const matrix = initializeSeatingMatrix();

  const single = checkSeatAvailability(matrix, 1);
  assert(single.success, "Empty room should have one available seat.", failures);
  assert(
    formatSeatPositions(single.positions) === "(1, 1)",
    "Empty room first seat should be (1, 1).",
    failures
  );

  const adjacent = checkSeatAvailability(matrix, 2);
  assert(adjacent.success, "Empty room should have adjacent seats.", failures);
  assert(
    formatSeatPositions(adjacent.positions) === "(1, 1), (1, 2)",
    "Empty room first adjacent pair should be (1, 1), (1, 2).",
    failures
  );

  const counts = getSeatCounts(matrix);
  assert(
    counts.occupied === 0 && counts.available === 80,
    "Empty room should report 0 occupied and 80 available.",
    failures
  );

  console.log("Scenario 1 passed: Empty room");
}

/**
 * Scenario 2: Partially filled room.
 * Verifies predictable first available seats and successful/failed reservation behavior.
 */
function scenarioPartiallyFilledRoom(failures: string[]): void {
  const matrix = initializeSeatingMatrix();

  for (let col = 1; col <= 5; col += 1) {
    validateAndReserveSeats(matrix, 1, col, 1);
  }

  const single = checkSeatAvailability(matrix, 1);
  assert(
    formatSeatPositions(single.positions) === "(1, 6)",
    "Partially filled room first available seat should be (1, 6).",
    failures
  );

  const adjacent = checkSeatAvailability(matrix, 2);
  assert(
    formatSeatPositions(adjacent.positions) === "(1, 6), (1, 7)",
    "Partially filled room adjacent seats should be (1, 6), (1, 7).",
    failures
  );

  const taken = validateAndReserveSeats(matrix, 1, 1, 1);
  assert(
    !taken.success && taken.message === STAFF_MESSAGES.seatAlreadyTaken,
    "Reserving an occupied seat should return SEAT ALREADY TAKEN.",
    failures
  );

  const reservation = validateAndReserveSeats(matrix, 2, 1, 2);
  assert(
    reservation.success && reservation.message === STAFF_MESSAGES.reservationConfirmed,
    "Adjacent reservation should return RESERVATION CONFIRMED.",
    failures
  );

  console.log("Scenario 2 passed: Partially filled room");
}

/**
 * Scenario 3: Nearly full room with scattered single seats only.
 * Confirms single-seat availability remains while adjacent-seat checks fail.
 */
function scenarioNearlyFullScatteredSingles(failures: string[]): void {
  const matrix = initializeSeatingMatrix();

  for (let row = 1; row <= TOTAL_ROWS; row += 1) {
    for (let col = 1; col <= TOTAL_COLUMNS; col += 1) {
      validateAndReserveSeats(matrix, row, col, 1);
    }
  }

  for (let row = 1; row <= TOTAL_ROWS; row += 1) {
    const col = row % 2 === 0 ? 2 : 1;
    matrix[row - 1][col - 1] = 0;
  }

  const single = checkSeatAvailability(matrix, 1);
  assert(single.success, "Scattered singles should still return one seat.", failures);

  const adjacent = checkSeatAvailability(matrix, 2);
  assert(
    !adjacent.success,
    "Scattered singles should not return adjacent seats.",
    failures
  );

  console.log("Scenario 3 passed: Nearly full room with scattered singles");
}

/**
 * Scenario 4: Fully occupied room.
 * Confirms no availability and no successful reservation can occur.
 */
function scenarioFullRoom(failures: string[]): void {
  const matrix = initializeSeatingMatrix();

  for (let row = 1; row <= TOTAL_ROWS; row += 1) {
    for (let col = 1; col <= TOTAL_COLUMNS; col += 1) {
      validateAndReserveSeats(matrix, row, col, 1);
    }
  }

  const single = checkSeatAvailability(matrix, 1);
  assert(!single.success, "Full room should not return single seats.", failures);

  const adjacent = checkSeatAvailability(matrix, 2);
  assert(!adjacent.success, "Full room should not return adjacent seats.", failures);

  const reservation = validateAndReserveSeats(matrix, 1, 1, 1);
  assert(!reservation.success, "Full room reservation should fail.", failures);

  const counts = getSeatCounts(matrix);
  assert(
    counts.occupied === 80 && counts.available === 0,
    "Full room should report 80 occupied and 0 available.",
    failures
  );

  console.log("Scenario 4 passed: Full room");
}

/**
 * Minimal assertion helper that records failures instead of throwing,
 * allowing all scenario checks to run in one pass.
 */
function assert(condition: boolean, message: string, failures: string[]): void {
  if (!condition) {
    failures.push(message);
  }
}

if (typeof document !== "undefined") {
  import("./style.css").then(() => {
    const app = document.querySelector<HTMLDivElement>("#app");
    if (app) {
      app.innerHTML = [
        "<h1>Cinema Seat Reservation Prototype</h1>",
        "<p>Run in terminal: npm run console</p>",
        "<p>Run scenarios: npm run console -- --test</p>"
      ].join("");
    }
  });
} else {
  const cliArgs = (globalThis as { process?: { argv?: string[] } }).process?.argv ?? [];
  const shouldRunTests = cliArgs.includes("--test");

  if (shouldRunTests) {
    runScenarioTests();
  } else {
    runCli().catch((error) => {
      console.error("Unexpected CLI error:", error);
    });
  }
}

export {};
