import { useRouter } from "next/router";
import { useEffect } from "react";
import { interval, Subscription } from "rxjs";

export default function Play() {
  const timer = interval(128);
  const sub = new Subscription();

  //Crude gameloop.
  //7.5 fps is 128ms interval
  useEffect(() => {
    sub.add(
      timer.subscribe((i) => {
        console.log(`~~~ tick: ${i}`);
      })
    );

    return () => {
      sub.unsubscribe();
    };
  }, []);
  // useEffect(() => {
  //   console.log("~~~ unsubscribe");

  // });
  const router = useRouter();
  const { name, gameType } = router.query;
  /**
   * I need to render a game board via state (not going into redux for this - maybe next project)
   * We can maybe store the state in just a regular old JSON object :think:
   *
   * We need
   * -An X and Y coordinate for each square
   * -A display value
   * -An eaten state (boolean)
   * -Player occupied
   * -Troggle occupied
   * -A running game loop that maybe repeats at quarter second intervals (could also experiment with 30fps)
   * -
   */

  return (
    <div>
      <h1>{router.query.a}</h1>
    </div>
  );
}
