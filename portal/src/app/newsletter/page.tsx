import type { Metadata } from "next";
import { LedText } from "@/components/LedText";
import {
  formatNewsletterDate,
  getAllNewsletterPosts,
  markdownToHtml,
} from "@/lib/newsletter";

export const metadata: Metadata = {
  title: "Class updates",
};

export default function NewsletterPage() {
  const posts = getAllNewsletterPosts();

  return (
    <>
      <header className="page-hero">
        <div className="page-hero-inner">
          <LedText as="p" className="eyebrow" text="K–8 Music Pilot" />
          <LedText as="h1" className="page-title" text="Class updates" />
          <LedText
            as="p"
            className="page-lede"
            text="Short notes from music class — for families, students, and anyone checking in."
          />
        </div>
      </header>

      <div className="section">
        <div className="wrap">
          {posts.length === 0 ? (
            <div className="empty-note" role="status">
              <p>No class updates yet. Check back after the next music class.</p>
            </div>
          ) : (
            <ol className="newsletter-log">
              {posts.map((post) => (
                <li key={post.slug}>
                  <article className="newsletter-post">
                    <time dateTime={post.created}>
                      {formatNewsletterDate(post.created)}
                    </time>
                    <h2>{post.title}</h2>
                    <div
                      className="slide-body"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(post.body) }}
                    />
                  </article>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}
