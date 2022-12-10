import { GameType } from "../../pages";

//UTIL (TODO: move util fns to their own file)
export function isPrime(num: number) {
  if (num < 2) return false;
  let rootFloor = Math.floor(Math.sqrt(num));
  for (let i = 2; i <= rootFloor; i++) {
    if (num % i == 0) return false;
  }
  return true;
}
export function getOneHundredPrimes() {
  let result = [];
  for (let i = 2; i <= 100; i++) {
    if (isPrime(i)) {
      result.push(i);
    }
  }
  return result;
}
export function generatePrimeFactors(num: number, primes: Array<number>) {
  console.log("generating prime factors for: " + num);
  console.log("primes length: " + primes.length);
  if (isPrime(num)) return [num];
  let primeFactors = new Array<number>();
  let divisor = primes[0];
  let dividend = num;
  let quotient = dividend / divisor;
  let primeLimit = Math.ceil(num / 2);
  let primeIndex = 0;
  while (primes[primeIndex] <= primeLimit && primeIndex < primes.length) {
    quotient = dividend / divisor;
    if (quotient % 1 === 0) {
      primeFactors.push(divisor);
      dividend = quotient;
    } else {
      primeIndex++;
      divisor = primes[primeIndex];
    }
  }
  return primeFactors;
}

//Lets choose from 1 to level
export function nIndicesChooseK(arr: Array<number>) {
  let result = new Array<Array<number>>();

  let aux = (i: number, remain: number, acc: Array<number>) => {
    if (remain > 0) {
      for (let m = i + 1; m < arr.length; m++) {
        aux(m, remain - 1, [...acc, m]);
      }
    } else {
      result.push(acc);
    }
  };

  //Altering this so that k passed in is the upper bound
  //and we generate all nChooseK s.t. K is an integer in range [1..k]
  for (let i = 1; i <= arr.length; i++) {
    aux(-1, i, []);
  }

  return result;
}

export function generateFactorsAnswers(
  numCols: number,
  numRows: number,
  primeFactors: Array<number>,
  primeIndexCombinations: Array<Array<number>>
) {
  //let minAnswers = new Map<String, number>();
  let minAnswers: { [key: string]: number } = {};
  let answersSet = new Set<number>();
  let colMultiplierMod = Math.floor(numCols / 10) + 1;
  let rowMultiplierMod = Math.floor(numRows / 10) + 1;

  /**
   * use nChooseK to get all combinations of factors indices
   *
   * Get all from 1 -> (n-1)
   *
   * For now we'll do just 2
   */
  console.log(`!! index combos ${primeIndexCombinations}`);

  //For each index combination array, create the product sum of each index of primeFactors[i] * primeFactors[i-1]
  for (let i = 0; i < primeIndexCombinations.length; i++) {
    let curSum = 1;
    for (let j = 0; j < primeIndexCombinations[i].length; j++) {
      curSum *= primeFactors[primeIndexCombinations[i][j]];
    }
    answersSet.add(curSum);
  }

  let answers = Array.from(answersSet);

  for (let i = 0; i < answers.length; i++) {
    let cur = answers[i];

    let randColumn =
      Math.floor(Math.random() * Math.pow(10, colMultiplierMod)) % numCols;
    let randRow =
      Math.floor(Math.random() * Math.pow(10, rowMultiplierMod)) % numRows;
    let key = `${randRow}#${randColumn}`;

    //keep generating key until we dont have it

    // while (Object.keys(minAnswers).includes(key)) {
    randColumn =
      Math.floor(Math.random() * Math.pow(10, colMultiplierMod)) % numCols;
    randRow =
      Math.floor(Math.random() * Math.pow(10, rowMultiplierMod)) % numRows;
    key = `${randRow}#${randColumn}`;
    // }

    //minAnswers.set(key, cur);
    minAnswers[key] = cur;
  }
  return minAnswers;
}

export function generateMultiplesAnswers(
  numCols: number,
  numRows: number,
  level: number
) {
  let minAnswers: { [key: string]: number } = {};
  let colMultiplierMod = Math.floor(numCols / 10) + 1;
  let rowMultiplierMod = Math.floor(numRows / 10) + 1;
  let cur = -1;
  for (let i = 0; i < 4; i++) {
    while (cur % level !== 0) {
      cur = Math.floor(1 + Math.random() * 100 + (level * 2 - 1));
    }
    let randColumn =
      Math.floor(Math.random() * Math.pow(10, colMultiplierMod)) % numCols;
    let randRow =
      Math.floor(Math.random() * Math.pow(10, rowMultiplierMod)) % numRows;
    let key = `${randRow}#${randColumn}`;
    minAnswers[key] = cur;
    cur = -1;
  }
  console.log("generated: " + minAnswers);
  return minAnswers;
}

//Next: Since this is dependent on the answerMap (in state)
//this generation function will also need to be moved into an async thunk
export function generateBoardWithAnswers(
  resolvedGameType: GameType,
  numRows: number,
  numCols: number,
  level: number,
  answerMap: { [key: string]: number }
) {
  let board = new Array<Array<number | String>>();
  let numAnswers = 0;

  console.log(`util got answermap: ${answerMap}`);
  //   if (resolvedGameType == GameType.Multiples) {
  //     generateMultiplesAnswers(answerMap);
  //   }

  for (let i = 0; i < numRows; i++) {
    let row: Array<number | String> = [];
    for (let j = 0; j < numCols; j++) {
      //If we've already designated this row & col to have a valid answer
      //We populate that spot with the answer from a map
      let key = `${i}#${j}`;
      if (Object.keys(answerMap).includes(key)) {
        console.log(`answer map had ${key} for ${answerMap[key]}`);
        row.push(answerMap[key]);
        numAnswers++;
      } else {
        //Else just make anything
        let generatedValue = Math.floor(
          1 + Math.random() * 100 + (level * 2 - 1)
        );
        //If multiples
        if (
          resolvedGameType === GameType.Multiples &&
          generatedValue % level === 0
        ) {
          numAnswers++;
        }
        //If factors
        else if (
          resolvedGameType === GameType.Factors &&
          (level / generatedValue) % 1 === 0
        ) {
          numAnswers++;
        }
        row.push(generatedValue);
      }
    }
    board.push(row);
  }
  return { numAnswers, generatedBoard: board };
}
