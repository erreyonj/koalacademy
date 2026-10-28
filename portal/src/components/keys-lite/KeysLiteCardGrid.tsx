import Link from "next/link";

export type KeysLiteCard = {
  id: string;
  code: string;
  title: string;
  description: string;
  href: string;
  status: "Live" | "Coming";
};

export function KeysLiteCardGrid({ cards }: { cards: readonly KeysLiteCard[] }) {
  return (
    <ul className="keys-lite-grid" role="list">
      {cards.map((card) => (
        <li key={card.id}>
          <Link href={card.href} className="keys-lite-card btn-backlit">
            <span className="keys-lite-card-code">{card.code}</span>
            <span className="keys-lite-status">{card.status}</span>
            <span className="keys-lite-card-title">{card.title}</span>
            <span className="keys-lite-card-focus">{card.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
