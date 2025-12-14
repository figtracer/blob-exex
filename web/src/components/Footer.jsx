import { Heart } from "lucide-react";

function Footer() {
  return (
    <>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="made-with">
              Made with <Heart size={14} className="heart-icon" /> by
            </span>
            <a
              href="https://x.com/figtracer"
              target="_blank"
              rel="noopener noreferrer"
              className="author"
            >
              Fig
            </a>
          </div>

          <div className="footer-socials">
            <a
              href="https://github.com/figtracer"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <img src="/icons/socials/github.png?v=2" alt="GitHub" />
            </a>
            <a
              href="https://x.com/home"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
            >
              <img src="/icons/socials/x.png?v=2" alt="X" />
            </a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .footer {
          padding: 1.5rem 0;
          margin-top: auto;
        }

        .footer-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .made-with {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .heart-icon {
          color: var(--accent-red);
          fill: var(--accent-red);
          animation: heartbeat 1.5s ease-in-out infinite;
        }

        @keyframes heartbeat {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .author {
          font-weight: 600;
          color: var(--accent-purple);
        }

        .footer-socials {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .footer-socials a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .footer-socials a:hover {
          transform: translateY(-2px);
        }

        .footer-socials img {
          width: 18px;
          height: 18px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .footer-socials a:hover img {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .footer-content {
            padding: 0 1rem;
            flex-direction: column;
            gap: 1rem;
          }

          .footer-left {
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </>
  );
}

export default Footer;
