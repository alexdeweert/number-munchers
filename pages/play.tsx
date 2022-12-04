import { useRouter } from "next/router";
import { Key, useCallback, useEffect, useState } from "react";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { interval, Subscription } from "rxjs";
import {
  setUpButtonPressed,
  setUpButtonReleased,
  setDownButtonReleased,
  setDownButtonPressed,
  setRightButtonPressed,
  setRightButtonReleased,
  setLeftButtonPressed,
  setLeftButtonReleased,
  moveUp,
  moveDown,
  moveLeft,
  moveRight,
  updateBoardValue,
  setSpaceButtonPressed,
  setSpaceButtonReleased,
  decrementLives,
  pushMessage,
  popMessaage,
  setAnswersRemaining,
  decrementAnswersRemaining,
  incrementLevel,
  setLevel,
  generatePrimesAsync,
  generatePrimeFactorsAsync,
  generateIndexCombinationsAsync,
  generateFactorsAnswersAsync,
  generateBoardWithAnswersAsync,
  setLevelAsync,
} from "../redux/board";
import { AppState, AppDispatch } from "../store";
import { GameType } from ".";
import { isPrime } from "../redux/util/util";

export default function Play() {
  const router = useRouter();
  const { name, gameType } = router.query;
  const board = useSelector((state: AppState) => state.board.board);
  const dispatch = useDispatch<AppDispatch>();
  const timer = interval(1000);
  const sub = new Subscription();
  const [activeCellClass, setActiveCellClass] = useState("purple-cell");
  const [tileWidth, setTileWidth] = useState(100);
  const [tileHeight, setTileHeight] = useState(100);
  const [won, setWon] = useState(0);
  //TODO: maybe resolve from state instead?
  //Especially if state can be re-hydrated from localstorage
  const [resolvedGameType, setResolvedGameType] = useState(
    gameType ?? GameType.Multiples
  );
  const upButtonPressed = useSelector(
    (state: AppState) => state.board.upButtonPressed
  );
  const downButtonPressed = useSelector(
    (state: AppState) => state.board.downButtonPressed
  );
  const leftButtonPressed = useSelector(
    (state: AppState) => state.board.leftButtonPressed
  );
  const rightButtonPressed = useSelector(
    (state: AppState) => state.board.rightButtonPressed
  );
  const spaceButtonPressed = useSelector(
    (state: AppState) => state.board.spaceButtonPressed
  );
  const activeCellX = useSelector(
    (state: AppState) => state.board.activeCell[0]
  );
  const activeCellY = useSelector(
    (state: AppState) => state.board.activeCell[1]
  );
  const validInputKeys = useSelector(
    (state: AppState) => state.board.validInputKeys
  );
  const cellValue = useSelector(
    (state: AppState) =>
      state.board.board[state.board.activeCell[1]][state.board.activeCell[0]]
  );
  const numLives = useSelector((state: AppState) => state.board.lives);
  const level = useSelector((state: AppState) => state.board.level);
  const numMessages = useSelector(
    (state: AppState) => state.board.messages.length
  );
  const peekMessages = useSelector(
    (state: AppState) => state.board.messages[0]
  );
  const answersRemaining = useSelector(
    (state: AppState) => state.board.answersRemaining
  );
  const numRows = useSelector((state: AppState) => state.board.numRows);
  const numCols = useSelector((state: AppState) => state.board.numCols);
  const primes = useSelector((state: AppState) => state.board.primes);
  const primeFactors = useSelector(
    (state: AppState) => state.board.primeFactors
  );
  const primeIndexCombinations = useSelector(
    (state: AppState) => state.board.primeIndexCombinations
  );

  let keyPressedEventHandler = (event: any) => {
    if (event.key) {
      if (
        !(
          validInputKeys.includes(event.key) ||
          validInputKeys.includes(event.keyCode)
        )
      ) {
        return;
      }
      event.preventDefault();
      //If there are messages, space dismisses it and pops a message
      //TODO: If there are messages we should pause game logic (ie; the ticker)
      if (numMessages) {
        if (event.keyCode === 32 && !spaceButtonPressed) {
          //If we're here and there aren't any answers left, reset the board and
          //advance the level?
          dispatch(popMessaage());
          if (answersRemaining === 0) {
            //TODO: Maybe set a boolean in the useEffect dependency array for the board reset state
            //So here we increment the level, etc, and then re-roll the board
            console.log("you win, would reset level");
            dispatch(incrementLevel());
            setWon(won + 1);
          }
        }
        return;
      }
      //No messages
      else {
        if (event.key === "w" && !upButtonPressed) {
          dispatch(setUpButtonPressed());
          dispatch(moveUp());
        } else if (event.key === "s" && !downButtonPressed) {
          dispatch(setDownButtonPressed());
          dispatch(moveDown());
        } else if (event.key === "a" && !leftButtonPressed) {
          dispatch(setLeftButtonPressed());
          dispatch(moveLeft());
        } else if (event.key === "d" && !rightButtonPressed) {
          dispatch(setRightButtonPressed());
          dispatch(moveRight());
        } else if (event.keyCode === 32 && !spaceButtonPressed) {
          dispatch(setSpaceButtonPressed());
          handleSpacebarPressed();
        }
      }
    }
  };

  let keyReleasedEventHandler = (event: any) => {
    if (event.key) {
      if (
        !(
          validInputKeys.includes(event.key) ||
          validInputKeys.includes(event.keyCode)
        )
      ) {
        return;
      }
      if (event.key === "w") {
        dispatch(setUpButtonReleased());
      } else if (event.key === "s") {
        dispatch(setDownButtonReleased());
      } else if (event.key === "a") {
        dispatch(setLeftButtonReleased());
      } else if (event.key === "d") {
        dispatch(setRightButtonReleased());
      } else if (event.keyCode === 32) {
        dispatch(setSpaceButtonReleased());
      }
    }
  };

  //Input listeners
  useEffect(() => {
    if (undefined !== window) {
      window.addEventListener("keydown", keyPressedEventHandler);
      window.addEventListener("keyup", keyReleasedEventHandler);
    }

    return () => {
      window.removeEventListener("keydown", keyPressedEventHandler);
      window.removeEventListener("keyup", keyReleasedEventHandler);
    };
  });

  //Board generation with query params
  useEffect(() => {
    console.log("---###--- board init: useEffect");
    if (typeof gameType == "string") {
      setResolvedGameType(gameType);
    }

    if (resolvedGameType == GameType.Factors) {
      //We need to regnerate the prime factors for every level
      //since every non-prime has a unique prime factorization
      initializeFactorsBoard();
    } else if (resolvedGameType == GameType.Multiples) {
      initializeMultiplesBoard();
    }
  }, [won]);

  async function initializeFactorsBoard() {
    //First init (state is initialized to -1)
    if (level < 4) {
      await dispatch(setLevelAsync(4));
    }
    //Increment level when regenerating
    else {
      let curLevel = level;
      while (isPrime(curLevel)) {
        curLevel++;
      }
      await dispatch(setLevelAsync(curLevel));
    }
    await dispatch(generatePrimesAsync());
    await dispatch(generatePrimeFactorsAsync());
    await dispatch(generateIndexCombinationsAsync());
    await dispatch(generateFactorsAnswersAsync());
    await dispatch(generateBoardWithAnswersAsync());
  }

  async function initializeMultiplesBoard() {
    //Or we just set to the default board dims, 3x3 (have to do this until we
    //figure out how to store the redux state to localstorage to mitigate refresh
    //or direct link)
    let board: Array<Array<number | String>> = [];
    //Generate at least 5 answers associated to a random row and col.
    // const numAnswers = generateBoardWithAnswers(board);
    // dispatch(setAnswersRemaining({ remaining: numAnswers }));
    // dispatch(setBoard({ board: board }));
  }

  function setStylingIfActive(row: number, column: number): String | undefined {
    if (activeCellX == column && activeCellY == row) {
      return activeCellClass;
    }
  }

  function getParentStyle(): React.CSSProperties {
    let cssProperties: React.CSSProperties = {};
    cssProperties.display = "grid";
    cssProperties.gridTemplateRows = board
      .map((_e) => {
        return `${tileHeight}px`;
      })
      .join(" ");
    cssProperties.gridTemplateColumns = board[0]
      .map((_e) => {
        return `${tileWidth}px`;
      })
      .join(" ");
    return cssProperties;
  }

  function highlightIfCheating(element: number | String | undefined) {
    if (typeof element == "number") {
      //If multiples
      if (resolvedGameType == GameType.Multiples && element % level === 0) {
        return true;
      } else if (
        resolvedGameType === GameType.Factors &&
        (level / element) % 1 === 0
      ) {
        return true;
      }
    }
    return false;
  }

  function getBoardElements() {
    let results = [];
    for (let i = 0; i < board.length; i++) {
      const row = board[i];
      for (let j = 0; j < row.length; j++) {
        let element = row[j];
        results.push(
          <div
            // className={`cell ${setStylingIfActive(i, j)}`}
            className={`cell ${setStylingIfActive(i, j)} ${
              highlightIfCheating(element) ? "cheating" : "not-cheating"
            }`}
            style={{
              gridRow: `${i + 1}/${i + 2}`,
              gridColumn: `${j + 1}/${j + 2}`,
              borderLeft: j == 0 ? 4 : 2,
              borderTop: i == 0 ? 4 : 2,
              borderRight: j == row.length - 1 ? 4 : 2,
              borderBottom: i == board.length - 1 ? 4 : 2,
              borderStyle: "solid",
              borderColor: "magenta",
            }}
            key={`${i}#${j}`}
            id={`${i}#${j}`}
          >
            {element}
          </div>
        );
      }
    }
    return results;
  }

  function getFormattedGameTypeTitle(gameType: string | string[] | undefined) {
    switch (typeof gameType) {
      case "string":
        return gameType[0].toUpperCase().concat(gameType.substring(1));
      case "object":
        return gameType.join(" ");
      default:
        return "Game";
    }
    if (typeof gameType === "string") {
      return;
    }
  }

  function getNumLivesElements() {
    let elements: Array<JSX.Element> = [];
    for (let i = 0; i < numLives; i++) {
      elements.push(
        <h2
          className={`text-center text-2xl mb-5 font-bold text-cyan-500 mt-10 ${
            i === numLives - 1 ? "mr-0" : "mr-5"
          }`}
          key={i}
        >
          {"(◡‿◡✿)"}
        </h2>
      );
    }
    return elements;
  }

  function renderNextMessageElement() {
    return [
      <h1
        className="text-center text-2xl font-bold text-cyan-500"
        key="messageElement"
      >
        {peekMessages}
      </h1>,
      <h2 key="pressSpaceElementKey">Press space to continue</h2>,
    ];
  }

  //This only works for
  // function generateMultiplesAnswers(minAnswers: Map<String, number>) {
  //   let colMultiplierMod = Math.floor(numCols / 10) + 1;
  //   let rowMultiplierMod = Math.floor(numRows / 10) + 1;
  //   let cur = -1;
  //   for (let i = 0; i < 1; i++) {
  //     while (cur % level !== 0) {
  //       cur = Math.floor(1 + Math.random() * 100 + (level * 2 - 1));
  //     }
  //     let randColumn =
  //       Math.floor(Math.random() * Math.pow(10, colMultiplierMod)) % numCols;
  //     let randRow =
  //       Math.floor(Math.random() * Math.pow(10, rowMultiplierMod)) % numRows;
  //     let key = `${randRow}#${randColumn}`;
  //     minAnswers.set(key, cur);
  //     cur = -1;
  //   }
  // }

  /**
   * Generating factors:
   *
   * A factor is a whole number that divides another whole number without a remainder.
   * For example, if we have 12. 2 divides 12 with remainder zero.
   *
   * Since every non-prime integer can be divided into a unqiue set of primes,
   * its possible to find the prime factorization of a number, and then use
   * every combination of those factors to come up with all possible factors of another.
   *
   * For example. The prime factorization of 12 is:
   * [ 2, 2, 3 ]
   *
   * Then we can use combinatorics to find all possible factors.
   * In this case we do:
   * 3 choose 1
   * 3 choose 2
   * 3 choose 3 (will be the whole number itself
   *
   * So those factors are [ 1, 2, 3, 4, 6, 12 ]
   */

  // function generatePrimeFactors(num: number) {
  //   // let primes = [
  //   //   2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67,
  //   //   71, 73, 79, 83, 89, 97,
  //   // ];
  //   console.log("generating prime factors for: " + num);
  //   console.log("primes length: " + primes.length);
  //   //If num is prime just return itself
  //   if (isPrime(num)) return [num];

  //   //This checks if a number is indeed prime - lets generate all primes up to 100
  //   let primeFactors = new Array<number>();
  //   let divisor = primes[0];
  //   let dividend = num;
  //   let quotient = dividend / divisor;

  //   //Only need to check divisors up to half the num
  //   //Otherwise it can't be a divisor
  //   let primeLimit = Math.ceil(num / 2);
  //   let primeIndex = 0;
  //   while (primes[primeIndex] <= primeLimit && primeIndex < primes.length) {
  //     quotient = dividend / divisor;
  //     //Checks if the quotient was whole after dividing
  //     if (quotient % 1 === 0) {
  //       primeFactors.push(divisor);
  //       dividend = quotient;
  //     }
  //     //The quotient wasn't whole, try the next prime
  //     else {
  //       primeIndex++;
  //       divisor = primes[primeIndex];
  //     }
  //   }
  //   return primeFactors;
  // }

  // function isPrime(num: number) {
  //   if (num < 2) return false;
  //   let rootFloor = Math.floor(Math.sqrt(num));
  //   for (let i = 2; i <= rootFloor; i++) {
  //     if (num % i == 0) return false;
  //   }
  //   return true;
  // }

  // function nIndicesChooseK(arr: Array<number>, k: number) {
  //   let result = new Array<Array<number>>();

  //   console.log(`arr: ${arr}`);

  //   let aux = (i: number, remain: number, acc: Array<number>) => {
  //     if (remain > 0) {
  //       for (let m = i + 1; m < arr.length; m++) {
  //         aux(m, remain - 1, [...acc, m]);
  //       }
  //     } else {
  //       result.push(acc);
  //     }
  //   };

  //   aux(-1, k, []);
  //   return result;
  // }

  function handleSpacebarPressed() {
    if (cellValueIsValidAnswer()) {
      //console.log(`MUNCHED ${cellValue}, a multiple of: ${level}`);
      clearActiveCell();
      if (answersRemaining === 1) {
        dispatch(pushMessage({ message: "Noice" }));
      }
      dispatch(decrementAnswersRemaining());
    } else if (typeof cellValue !== "undefined") {
      dispatch(
        pushMessage({
          message: `${cellValue} is not ${gameTypeSingular()} ${level}`,
        })
      );
      dispatch(decrementLives());
      clearActiveCell();
    }
  }

  function cellValueIsValidAnswer(): boolean {
    if (typeof cellValue == "number") {
      switch (resolvedGameType) {
        case GameType.Multiples:
          return cellValue % level == 0;
        case GameType.Factors:
          return (level / cellValue) % 1 === 0;
        default:
          return false;
      }
    }
    return false;
  }

  function gameTypeSingular() {
    switch (resolvedGameType) {
      case GameType.Multiples:
        return "a multiple of";
      case GameType.Factors:
        return "a factor of";
      default:
        return "an answer for";
    }
  }

  function clearActiveCell() {
    dispatch(
      updateBoardValue({
        row: activeCellY,
        column: activeCellX,
        value: undefined,
      })
    );
  }

  return (
    <div className="play-container flex flex-col items-center">
      <h1 className="text-center text-3xl mb-2 font-bold text-cyan-500 mt-10">
        {getFormattedGameTypeTitle(resolvedGameType)} of {level}
      </h1>
      <h3 className="text-center mb-5 font-bold text-cyan-500">
        {name?.length ? name : "Muncher"}&apos;s Game
      </h3>
      <div className="relative" style={getParentStyle()}>
        {getBoardElements()}
        {numMessages > 0 && (
          <div className="message flex flex-col items-center justify-center">
            {renderNextMessageElement()}
          </div>
        )}
      </div>
      <div className="play-container flex flex-row items-center">
        {getNumLivesElements()}
      </div>
    </div>
  );
}
