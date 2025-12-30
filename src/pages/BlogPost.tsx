import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  BookOpen, Clock, Eye, Star, MessageCircle, ArrowLeft, Share2,
  ThumbsUp, Reply, ChevronRight, Calendar, User, AlertTriangle,
  Info, CheckCircle, XCircle, TrendingUp, TrendingDown, Copy, Check,
  Link2, Shield, Lock, Globe, Cpu, Code,
  Server, Database, Cloud, Bookmark, Heart, Send, Sparkles, ArrowRight,
  Zap, Award, FileText
} from "lucide-react";
import { FaXTwitter, FaLinkedinIn, FaFacebookF } from "react-icons/fa6";
import { getBlogBySlug, getRelatedBlogs, type BlogPost, type BlogSection, type BlogComment, BLOG_POSTS } from "@/constants/blogs";
import { useToast } from "@/hooks/use-toast";
import { CLIPBOARD_FEEDBACK_DURATION_MS } from "@/constants/subscription";

// SEO meta tag updater with structured data
const updateMetaTags = (post: BlogPost) => {
  document.title = `${post.title} | AiVedha Guard Blog`;

  const description = post.excerpt.slice(0, 160);
  const keywords = post.tags.join(', ');

  // Update meta tags
  const metaTags = {
    'description': description,
    'keywords': keywords,
    'author': post.author.name,
  };

  Object.entries(metaTags).forEach(([name, content]) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  });

  // Open Graph tags
  const ogTags = {
    'og:title': post.title,
    'og:description': description,
    'og:type': 'article',
    'og:url': window.location.href,
    'og:image': post.coverImage,
    'article:author': post.author.name,
    'article:published_time': post.publishedAt,
  };

  Object.entries(ogTags).forEach(([property, content]) => {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  });

  // Twitter Card tags
  const twitterTags = {
    'twitter:card': 'summary_large_image',
    'twitter:title': post.title,
    'twitter:description': description,
    'twitter:image': post.coverImage,
  };

  Object.entries(twitterTags).forEach(([name, content]) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  });

  // Add JSON-LD structured data
  const scriptTag = document.querySelector('script[type="application/ld+json"]');
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": description,
    "image": post.coverImage,
    "author": {
      "@type": "Person",
      "name": post.author.name,
      "jobTitle": post.author.role,
    },
    "publisher": {
      "@type": "Organization",
      "name": "AiVedha Guard",
      "logo": {
        "@type": "ImageObject",
        "url": "https://aivedha.ai/logo.png"
      }
    },
    "datePublished": post.publishedAt,
    "mainEntityOfPage": window.location.href,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": post.rating,
      "ratingCount": post.ratingCount,
      "bestRating": "5"
    }
  };

  if (scriptTag) {
    scriptTag.textContent = JSON.stringify(structuredData);
  } else {
    const newScript = document.createElement('script');
    newScript.type = 'application/ld+json';
    newScript.textContent = JSON.stringify(structuredData);
    document.head.appendChild(newScript);
  }
};

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const floatAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const
  }
};

const pulseGlow = {
  scale: [1, 1.05, 1],
  opacity: [0.5, 0.8, 0.5],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut" as const
  }
};

// Format number with K/M suffix
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Relative time
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

// Floating Background Icons
const FloatingBackgroundIcons = () => {
  const icons = [
    { Icon: Shield, x: '5%', y: '20%', delay: 0, size: 'h-6 w-6' },
    { Icon: Lock, x: '95%', y: '30%', delay: 0.5, size: 'h-5 w-5' },
    { Icon: Globe, x: '90%', y: '60%', delay: 1, size: 'h-7 w-7' },
    { Icon: Cpu, x: '8%', y: '70%', delay: 1.5, size: 'h-5 w-5' },
    { Icon: Code, x: '92%', y: '80%', delay: 2, size: 'h-4 w-4' },
    { Icon: Database, x: '3%', y: '50%', delay: 2.5, size: 'h-5 w-5' },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {icons.map(({ Icon, x, y, delay, size }, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: x, top: y }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay,
            ease: "easeInOut"
          }}
        >
          <Icon className={`${size} text-primary/20`} />
        </motion.div>
      ))}
    </div>
  );
};

// Star Rating Component
const StarRating = ({ rating, count, size = "default", interactive = false }: { rating: number; count: number; size?: "small" | "default" | "large"; interactive?: boolean }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const iconSize = size === "small" ? "h-3 w-3" : size === "large" ? "h-6 w-6" : "h-5 w-5";
  const textSize = size === "small" ? "text-xs" : size === "large" ? "text-lg" : "text-sm";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.div
            key={star}
            whileHover={interactive ? { scale: 1.2 } : {}}
            onHoverStart={() => interactive && setHoverRating(star)}
            onHoverEnd={() => interactive && setHoverRating(0)}
          >
            <Star
              className={`${iconSize} cursor-${interactive ? 'pointer' : 'default'} transition-colors ${
                star <= (hoverRating || Math.floor(rating))
                  ? "fill-yellow-400 text-yellow-400"
                  : star - 0.5 <= rating
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </motion.div>
        ))}
      </div>
      <span className={`${textSize} font-medium text-foreground`}>{rating.toFixed(1)}</span>
      <span className={`${textSize} text-muted-foreground`}>({formatNumber(count)} ratings)</span>
    </div>
  );
};

// Animated Progress Bar for reading
const ReadingProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = (scrollTop / docHeight) * 100;
      setProgress(scrollProgress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div
      className="fixed top-16 left-0 right-0 h-1 bg-primary/20 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-primary via-violet-500 to-cyan-500"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  );
};

// Table of Contents
const TableOfContents = ({ content }: { content: BlogSection[] }) => {
  const headings = content.filter(s => s.type === 'heading');

  if (headings.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden xl:block fixed left-8 top-1/3 w-48 space-y-2"
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</p>
      {headings.map((heading, index) => (
        <motion.a
          key={index}
          href={`#section-${content.indexOf(heading)}`}
          className="block text-xs text-muted-foreground hover:text-primary transition-colors truncate"
          whileHover={{ x: 4 }}
        >
          {heading.content}
        </motion.a>
      ))}
    </motion.div>
  );
};

// Content Section Renderer with enhanced visuals
const ContentSection = ({ section, index }: { section: BlogSection; index: number }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), CLIPBOARD_FEEDBACK_DURATION_MS);
  };

  switch (section.type) {
    case 'heading':
      return (
        <motion.h2
          variants={fadeInUp}
          className="text-2xl md:text-3xl font-bold text-foreground mt-12 mb-4 scroll-mt-24 flex items-center gap-3 group"
          id={`section-${index}`}
        >
          <motion.div
            className="w-1 h-8 bg-gradient-to-b from-primary to-violet-500 rounded-full"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
          />
          {section.content}
          <Link2 className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.h2>
      );

    case 'paragraph':
      return (
        <motion.p
          variants={fadeInUp}
          className="text-lg text-muted-foreground leading-relaxed mb-6"
        >
          {section.content}
        </motion.p>
      );

    case 'list':
      return (
        <motion.ul variants={fadeInUp} className="space-y-4 mb-6 pl-2">
          {section.items?.map((item, i) => (
            <motion.li
              key={i}
              className="flex gap-3"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <motion.div
                whileHover={{ scale: 1.2, rotate: 360 }}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              </motion.div>
              <span className="text-muted-foreground leading-relaxed">{item}</span>
            </motion.li>
          ))}
        </motion.ul>
      );

    case 'code':
      return (
        <motion.div
          variants={fadeInUp}
          className="relative mb-6 group"
          whileHover={{ scale: 1.01 }}
        >
          <div className="absolute top-3 right-3 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyCode(section.content)}
              className="h-8 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {copied ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                >
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-xs">Copied!</span>
                </motion.div>
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-gradient-to-r from-primary/80 to-violet-600/80 text-white text-xs">
              {section.language || 'code'}
            </Badge>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-violet-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <pre className="relative bg-slate-900 text-slate-100 rounded-xl p-6 pt-12 overflow-x-auto text-sm leading-relaxed border border-slate-700">
            <code>{section.content}</code>
          </pre>
        </motion.div>
      );

    case 'quote':
      return (
        <motion.blockquote
          variants={fadeInUp}
          className="relative my-10 pl-6 pr-6 py-8 bg-gradient-to-r from-primary/5 to-violet-500/5 rounded-2xl border-l-4 border-primary overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
          <motion.div
            className="absolute -top-4 -left-4 text-8xl text-primary/10 font-serif"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            "
          </motion.div>
          <p className="text-lg italic text-foreground relative z-10 font-medium">{section.content}</p>
          <motion.div
            className="absolute -bottom-4 -right-4 text-8xl text-primary/10 font-serif rotate-180"
            animate={{ rotate: [180, 185, 175, 180] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            "
          </motion.div>
        </motion.blockquote>
      );

    case 'callout': {
      const calloutVariants = {
        warning: { icon: AlertTriangle, bg: 'from-yellow-500/10 to-orange-500/10', border: 'border-yellow-500/50', iconColor: 'text-yellow-500' },
        info: { icon: Info, bg: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/50', iconColor: 'text-blue-500' },
        success: { icon: CheckCircle, bg: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/50', iconColor: 'text-green-500' },
        danger: { icon: XCircle, bg: 'from-red-500/10 to-rose-500/10', border: 'border-red-500/50', iconColor: 'text-red-500' }
      };
      const calloutStyle = calloutVariants[section.variant || 'info'];
      const CalloutIcon = calloutStyle.icon;

      return (
        <motion.div
          variants={fadeInUp}
          className={`flex gap-4 p-6 rounded-2xl border ${calloutStyle.border} bg-gradient-to-r ${calloutStyle.bg} mb-6`}
          whileHover={{ scale: 1.01 }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CalloutIcon className={`h-6 w-6 ${calloutStyle.iconColor} flex-shrink-0 mt-0.5`} />
          </motion.div>
          <p className="text-foreground leading-relaxed">{section.content}</p>
        </motion.div>
      );
    }

    case 'stats':
      return (
        <motion.div
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 my-10"
        >
          {section.stats?.map((stat, i) => (
            <motion.div
              key={i}
              className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20 group"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/20 to-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute top-3 right-3 z-10">
                {stat.trend === 'up' && (
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </motion.div>
                )}
                {stat.trend === 'down' && (
                  <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </motion.div>
                )}
              </div>
              <motion.p
                className="text-4xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent mb-2"
                initial={{ scale: 0.5 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
              >
                {stat.value}
              </motion.p>
              <p className="text-sm text-muted-foreground relative z-10">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      );

    case 'image':
      return (
        <motion.figure
          variants={fadeInUp}
          className="my-10 group"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <motion.img
              src={section.content}
              alt="Blog illustration"
              className="w-full"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </motion.figure>
      );

    default:
      return null;
  }
};

// Comment Component with enhanced animations
const CommentCard = ({ comment, depth = 0 }: { comment: BlogComment; depth?: number }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes);

  const handleLike = () => {
    if (liked) {
      setLikeCount(prev => prev - 1);
    } else {
      setLikeCount(prev => prev + 1);
    }
    setLiked(!liked);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? 'ml-8 md:ml-12 border-l-2 border-primary/20 pl-4' : ''}`}
    >
      <motion.div
        className="flex gap-4 mb-6 p-4 rounded-xl hover:bg-card/50 transition-colors"
        whileHover={{ x: depth === 0 ? 4 : 0 }}
      >
        <motion.img
          src={comment.author.avatar}
          alt={comment.author.name}
          className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-primary/20"
          whileHover={{ scale: 1.1 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-medium text-foreground">{comment.author.name}</span>
            <span className="text-sm">{comment.author.countryFlag}</span>
            <Badge variant="secondary" className="text-xs">{comment.author.role}</Badge>
          </div>
          <p className="text-muted-foreground mb-3 leading-relaxed">{comment.content}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground text-xs">{getRelativeTime(comment.timestamp)}</span>
            <motion.button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              <span>{formatNumber(likeCount)}</span>
            </motion.button>
            <motion.button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              <Reply className="h-4 w-4" />
              Reply
            </motion.button>
          </div>

          <AnimatePresence>
            {showReplyForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <Textarea
                  placeholder="Write a reply..."
                  className="mb-3 min-h-[80px] resize-none rounded-xl"
                />
                <div className="flex gap-2">
                  <Button variant="invertPrimary" size="sm" className="gap-2 px-3 py-1.5">
                    <Send className="h-3 w-3" />
                    Post Reply
                  </Button>
                  <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={() => setShowReplyForm(false)}>Cancel</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {comment.replies?.map((reply) => (
        <CommentCard key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </motion.div>
  );
};

// Related Blog Card
const RelatedBlogCard = ({ post, index }: { post: BlogPost; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ y: -8, scale: 1.02 }}
  >
    <Link to={`/blogs/${post.slug}`}>
      <Card className="overflow-hidden h-full bg-card/50 hover:bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-xl">
        <div className="relative h-36 overflow-hidden">
          <motion.img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.4 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <Badge variant="secondary" className="absolute bottom-3 left-3 text-xs">{post.category}</Badge>
        </div>
        <CardContent className="p-4">
          <h4 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h4>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readTime} min
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {post.rating.toFixed(1)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

// Author Bio Card
const AuthorBioCard = ({ author }: { author: BlogPost['author'] }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="my-12"
  >
    <Card className="bg-gradient-to-br from-primary/5 to-violet-500/5 border-primary/20 overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <motion.img
            src={author.avatar}
            alt={author.name}
            className="w-20 h-20 rounded-2xl ring-4 ring-primary/20"
            whileHover={{ scale: 1.1, rotate: 5 }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-foreground">{author.name}</h3>
              <Badge className="bg-primary/20 text-primary">{author.countryFlag} {author.country}</Badge>
            </div>
            <p className="text-primary font-medium mb-2">{author.role}</p>
            {author.company && (
              <p className="text-muted-foreground text-sm mb-4">at {author.company}</p>
            )}
            <p className="text-muted-foreground text-sm leading-relaxed">
              Expert in cybersecurity with years of experience in enterprise security architecture,
              threat analysis, and security program development. Passionate about sharing knowledge
              and helping organizations build resilient security postures.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Main Component
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Dynamic price text
  const getUnderPriceText = () => 'Under $1 per audit'; // USD only globally

  const post = useMemo(() => slug ? getBlogBySlug(slug) : undefined, [slug]);
  const relatedPosts = useMemo(() => slug ? getRelatedBlogs(slug, 3) : [], [slug]);

  useEffect(() => {
    if (post) {
      updateMetaTags(post);
    }
    window.scrollTo(0, 0);
  }, [slug, post]);

  if (!post) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center relative">
          <FloatingBackgroundIcons />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center z-10"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <BookOpen className="h-20 w-20 text-muted-foreground/30 mx-auto mb-6" />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-3">Article Not Found</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
              The article you're looking for doesn't exist or may have been moved.
            </p>
            <Link to="/blogs">
              <Button variant="invertPrimary" className="gap-2 px-6 py-3">
                <ArrowLeft className="h-4 w-4" />
                Back to Blogs
              </Button>
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const shareUrl = window.location.href;
  const shareTitle = post.title;

  const handleShare = (platform: string) => {
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Article link has been copied to clipboard.",
        });
        setShowShareMenu(false);
        return;
    }
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  const handlePostComment = () => {
    if (newComment.trim()) {
      toast({
        title: "Comment posted!",
        description: "Thank you for sharing your thoughts.",
      });
      setNewComment("");
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({
      title: isBookmarked ? "Bookmark removed" : "Article bookmarked!",
      description: isBookmarked ? "Removed from your reading list." : "Added to your reading list.",
    });
  };

  return (
    <Layout>
      <article className="min-h-screen bg-background relative">
        <ReadingProgress />
        <FloatingBackgroundIcons />
        <TableOfContents content={post.content} />

        {/* Hero Section */}
        <section className="relative pt-8 pb-12 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <motion.div
            className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
            animate={pulseGlow}
          />
          <motion.div
            className="absolute top-40 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"
            animate={{ ...pulseGlow, transition: { ...pulseGlow.transition, delay: 1 } }}
          />

          <div className="container mx-auto px-4 max-w-4xl relative z-10">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* Back button */}
              <motion.div variants={fadeInUp}>
                <Link
                  to="/blogs"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 group"
                >
                  <motion.div whileHover={{ x: -4 }}>
                    <ArrowLeft className="h-4 w-4" />
                  </motion.div>
                  <span className="group-hover:underline">Back to Blogs</span>
                </Link>
              </motion.div>

              {/* Category & Meta */}
              <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-gradient-to-r from-primary to-violet-600 text-white">{post.category}</Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(post.publishedAt)}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime} min read
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                variants={fadeInUp}
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight"
              >
                {post.title}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                variants={fadeInUp}
                className="text-xl text-primary font-medium mb-6"
              >
                {post.subtitle}
              </motion.p>

              {/* Author & Stats Row */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap items-center justify-between gap-4 py-6 border-y border-border/50"
              >
                {/* Author */}
                <div className="flex items-center gap-4">
                  <motion.img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-14 h-14 rounded-full ring-2 ring-primary/20"
                    whileHover={{ scale: 1.1 }}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{post.author.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {post.author.role} at {post.author.company}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {post.author.countryFlag} {post.author.country}
                    </p>
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <motion.span
                      className="flex items-center gap-1.5"
                      whileHover={{ scale: 1.1 }}
                    >
                      <Eye className="h-4 w-4" />
                      {formatNumber(post.views)}
                    </motion.span>
                    <motion.span
                      className="flex items-center gap-1.5"
                      whileHover={{ scale: 1.1 }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.comments.length}
                    </motion.span>
                  </div>

                  {/* Bookmark button */}
                  <motion.button
                    onClick={handleBookmark}
                    className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </motion.button>

                  {/* Share button */}
                  <div className="relative">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </motion.div>

                    <AnimatePresence>
                      {showShareMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl p-2 z-50 min-w-[160px]"
                        >
                          {[
                            { platform: 'twitter', icon: FaXTwitter, label: 'X (Twitter)' },
                            { platform: 'linkedin', icon: FaLinkedinIn, label: 'LinkedIn' },
                            { platform: 'facebook', icon: FaFacebookF, label: 'Facebook' },
                            { platform: 'copy', icon: Link2, label: 'Copy Link' },
                          ].map(({ platform, icon: Icon, label }) => (
                            <motion.button
                              key={platform}
                              onClick={() => handleShare(platform)}
                              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                              whileHover={{ x: 4 }}
                            >
                              <Icon className="h-4 w-4" />
                              {label}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Rating */}
              <motion.div variants={fadeInUp} className="py-4">
                <StarRating rating={post.rating} count={post.ratingCount} size="large" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Cover Image */}
        <section className="container mx-auto px-4 max-w-5xl mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden shadow-2xl group"
          >
            <motion.img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-[300px] md:h-[400px] lg:h-[500px] object-cover"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.4 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Floating badge on image */}
            <motion.div
              className="absolute bottom-6 left-6 flex gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Badge className="bg-black/50 backdrop-blur-sm text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Expert Analysis
              </Badge>
            </motion.div>
          </motion.div>
        </section>

        {/* Content */}
        <section className="container mx-auto px-4 max-w-4xl relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {post.content.map((section, index) => (
              <ContentSection key={index} section={section} index={index} />
            ))}
          </motion.div>

          {/* Tags */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-border/50"
          >
            <span className="text-sm text-muted-foreground mr-2">Tags:</span>
            {post.tags.map((tag, i) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Badge variant="secondary" className="text-sm border border-transparent hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer transition-all duration-300">
                  #{tag}
                </Badge>
              </motion.div>
            ))}
          </motion.div>

          {/* Author Bio */}
          <AuthorBioCard author={post.author} />
        </section>

        {/* Rate This Article */}
        <section className="container mx-auto px-4 max-w-4xl py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-r from-primary/5 to-violet-500/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <motion.div
                  animate={floatAnimation}
                  className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4"
                >
                  <Award className="h-8 w-8 text-primary" />
                </motion.div>
                <h3 className="text-xl font-bold text-foreground mb-2">Did you find this article helpful?</h3>
                <p className="text-muted-foreground mb-4">Rate this article and help others discover great content</p>
                <StarRating rating={post.rating} count={post.ratingCount} size="large" interactive />
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Comments Section */}
        <section className="container mx-auto px-4 max-w-4xl py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-8">
              <motion.div
                className="p-2 bg-primary/10 rounded-xl"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <MessageCircle className="h-5 w-5 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">
                Discussion ({post.comments.length} comments)
              </h2>
            </div>

            {/* New Comment Form */}
            <Card className="mb-8 bg-card/50 border-border/50 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-semibold flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                  >
                    <User className="h-5 w-5" />
                  </motion.div>
                  <div className="flex-1">
                    <Input
                      placeholder="Your name"
                      className="mb-3 rounded-xl"
                    />
                    <Textarea
                      placeholder="Share your thoughts on this article..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="mb-3 min-h-[100px] resize-none rounded-xl"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Be respectful and constructive in your comments
                      </p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <button onClick={handlePostComment} disabled={!newComment.trim()} className="btn-primary px-4 py-2 rounded-xl inline-flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Post Comment
                        </button>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments List */}
            <div className="space-y-2">
              {post.comments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <CommentCard comment={comment} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="container mx-auto px-4 max-w-6xl py-12 border-t border-border/30">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="p-2 bg-accent/10 rounded-xl"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <BookOpen className="h-5 w-5 text-accent" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground">Related Articles</h2>
                </div>
                <Link to="/blogs" className="text-sm text-primary hover:underline flex items-center gap-1 group">
                  View all
                  <motion.div className="group-hover:translate-x-1 transition-transform">
                    <ChevronRight className="h-4 w-4" />
                  </motion.div>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost, index) => (
                  <RelatedBlogCard key={relatedPost.id} post={relatedPost} index={index} />
                ))}
              </div>
            </motion.div>
          </section>
        )}

        {/* Final CTA */}
        <section className="container mx-auto px-4 max-w-4xl py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-primary/10 via-violet-500/10 to-primary/10">
              <motion.div
                className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
                animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity }}
              />
              <CardContent className="relative p-8 md:p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-600 mb-6 shadow-lg"
                >
                  <Shield className="h-8 w-8 text-white" />
                </motion.div>

                <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Ready to Apply These Insights?
                </h3>
                <p className="text-primary font-medium mb-4">
                  "Security starts with knowledge, succeeds with action."
                </p>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Run a comprehensive security audit on your website using our 12 AI-powered
                  analysis modules. {getUnderPriceText()}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/security-audit">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <button className="border-2 border-primary bg-gradient-to-r from-primary to-violet-600 text-white hover:bg-background hover:from-background hover:to-background hover:text-primary hover:border-primary shadow-lg gap-2 transition-all duration-300">
                        <Shield className="h-5 w-5" />
                        Start Free Audit
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </motion.div>
                  </Link>
                  <Link to="/blogs">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <button className="gap-2">
                        <BookOpen className="h-5 w-5" />
                        More Articles
                      </button>
                    </motion.div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </article>
    </Layout>
  );
}
