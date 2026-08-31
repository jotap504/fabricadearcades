"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: React.ReactNode;
  description: string;
  ctaText: string;
  images: Array<string | { src: string; href?: string; alt?: string }>;
  className?: string;
}

export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline,
  title,
  description,
  ctaText,
  images,
  className,
}) => {
  const FADE_IN_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring" as const, stiffness: 80, damping: 15 } 
    },
  };

  const normalizedImages = images.map((image, index) =>
    typeof image === "string"
      ? { src: image, href: "/productos", alt: `Arcade destacado ${index + 1}` }
      : {
          src: image.src,
          href: image.href || "/productos",
          alt: image.alt || `Arcade destacado ${index + 1}`,
        }
  );

  // Duplicate images to create a seamless infinite loop
  const duplicatedImages = [...normalizedImages, ...normalizedImages, ...normalizedImages];

  return (
    <section
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "82vh",
        minHeight: "680px",
        overflow: "hidden",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start", // Align to top
        textAlign: "center",
        padding: "90px var(--space-4) 0", // 90px top padding to clear header
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Content Container */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "800px",
          margin: "0 auto",
          paddingBottom: "80px", /* Balanced bottom clearance */
        }}
      >

        {/* Title */}
        <motion.h1
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          style={{
            fontSize: "clamp(2.2rem, 5vw, 4rem)",
            fontWeight: 900,
            lineHeight: 1.15,
            color: "var(--color-text)",
            marginBottom: "var(--space-4)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}
        >
          {typeof title === "string" ? (
            title.split(" ").map((word, i) => (
              <motion.span
                key={i}
                variants={FADE_IN_ANIMATION_VARIANTS}
                style={{ display: "inline-block" }}
              >
                {word}&nbsp;
              </motion.span>
            ))
          ) : (
            title
          )}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.4 }}
          style={{
            fontSize: "clamp(1rem, 2vw, 1.125rem)",
            color: "var(--color-text-secondary, var(--color-text-muted))",
            maxWidth: "600px",
            lineHeight: 1.6,
            marginBottom: "var(--space-6)",
            fontWeight: 500,
          }}
        >
          {description}
        </motion.p>

        {/* Action Button */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.5 }}
        >
          <Link href="/productos" className="btn btn-primary btn-lg" id="hero-cta-button">
            {ctaText}
          </Link>
        </motion.div>
      </div>

      {/* Infinite Horizontal Image Marquee */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "260px",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {/* Soft edge masking using linear gradients */}
        <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", background: "linear-gradient(to top, var(--color-bg) 15%, transparent 60%)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "15%", zIndex: 3, pointerEvents: "none", background: "linear-gradient(to right, var(--color-bg), transparent)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "15%", zIndex: 3, pointerEvents: "none", background: "linear-gradient(to left, var(--color-bg), transparent)" }} />

        <motion.div
          style={{
            display: "flex",
            gap: "var(--space-5)",
            width: "max-content",
            padding: "var(--space-2) 0",
          }}
          animate={{
            x: ["0%", "-33.333%"],
          }}
          transition={{
            ease: "linear",
            duration: 25,
            repeat: Infinity,
          }}
        >
          {duplicatedImages.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              aria-label={`Ver ${item.alt}`}
              style={{
                width: "160px",
                height: "220px",
                flexShrink: 0,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                overflow: "hidden",
                boxShadow: "var(--shadow-md)",
                transform: `rotate(${index % 2 === 0 ? -1.5 : 1.5}deg) translateY(${index % 3 === 0 ? 5 : 0}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                transition: "transform var(--transition-fast), border-color var(--transition-fast)",
              }}
            >
              <img
                src={item.src}
                alt={item.alt}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  background: "#ffffff",
                  padding: "var(--space-1)",
                }}
              />
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
