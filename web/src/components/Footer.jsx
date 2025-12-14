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
              className="social-link"
              aria-label="GitHub"
            >
              <img
                src="/icons/socials/github.png"
                alt="GitHub"
                className="social-icon"
              />
            </a>
            <a
              href="https://x.com/home"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              aria-label="X (Twitter)"
            >
              <img src="/icons/socials/x.png" alt="X" className="social-icon" />
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

        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .social-link:hover {
          border-color: var(--border-secondary);
          background: var(--bg-hover);
          transform: translateY(-2px);
        }

        .social-icon {
          width: 18px;
          height: 18px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .social-link:hover .social-icon {
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
