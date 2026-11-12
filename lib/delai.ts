// Bound read-only loading without discarding the already loaded device copy.
export async function avecDelai<T>(action: PromiseLike<T>, millisecondes: number): Promise<T | null> {
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve(action), new Promise<null>(resolve => { minuterie=setTimeout(() => resolve(null),millisecondes); })]);
  } finally { if(minuterie!==undefined)clearTimeout(minuterie); }
}
