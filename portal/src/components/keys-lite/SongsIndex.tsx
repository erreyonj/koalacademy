import { KeysLiteCardGrid, type KeysLiteCard } from "./KeysLiteCardGrid";
import { SONG_SCORES } from "./songs";

const SONGS: KeysLiteCard[] = SONG_SCORES.map((song) => ({
  id: song.id,
  code: song.code,
  title: song.title,
  description: song.description,
  href: song.href,
  status: "Live",
}));

export function SongsIndex() {
  return <KeysLiteCardGrid cards={SONGS} />;
}
