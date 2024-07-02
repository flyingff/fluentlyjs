import { delay } from '@/util/promise';

export const getHighestScore = async () => {
  // mock delay
  await delay(1000);

  return parseInt(localStorage.getItem('highestScore') || '0', 10);
};

export const reportScore = async (score: number) => {
  // mock delay
  await delay(1000);

  const highestScore = parseInt(
    localStorage.getItem('highestScore') || '0',
    10,
  );
  if (score > highestScore) {
    localStorage.setItem('highestScore', score.toString());
  }

  return true;
};
