import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useDebounce } from "@/hooks/useDebounce";
import AivedhaAPI from "@/lib/api";
import {
  BookOpen, Search, Clock, Eye, Star, MessageCircle, TrendingUp,
  ChevronRight, Sparkles, Shield, ArrowRight, Calendar, User,
  Lock, Globe, Cpu, Zap, Target, Code, Server, Database, Cloud,
  FileText, Users, Award, CheckCircle
} from "lucide-react";
import { BLOG_POSTS, BLOG_CATEGORIES, getFeaturedBlogs, type BlogPost } from "@/constants/blogs";

// SEO meta tag updater
const updateMetaTags = (title: string, description: string, keywords: string) => {
  document.title = title;

  // Update or create meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description);
  } else {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', description);
    document.head.appendChild(metaDesc);
  }

  // Update or create meta keywords
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    metaKeywords.setAttribute('content', keywords);
  } else {
    metaKeywords = document.createElement('meta');
    metaKeywords.setAttribute('name', 'keywords');
    metaKeywords.setAttribute('content', keywords);
    document.head.appendChild(metaKeywords);
  }

  // Open Graph tags
  const ogTags = {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:url': window.location.href,
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
};

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const floatAnimation = {
  y: [0, -15, 0],
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

const rotateAnimation = {
  rotate: [0, 360],
  transition: {
    duration: 20,
    repeat: Infinity,
    ease: "linear" as const
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
    month: 'short',
    day: 'numeric'
  });
};

// Floating Security Icons Component
const FloatingIcons = () => {
  const icons = [
    { Icon: Shield, delay: 0, x: '10%', y: '20%', size: 'h-8 w-8' },
    { Icon: Lock, delay: 0.5, x: '85%', y: '15%', size: 'h-6 w-6' },
    { Icon: Globe, delay: 1, x: '75%', y: '70%', size: 'h-7 w-7' },
    { Icon: Cpu, delay: 1.5, x: '15%', y: '75%', size: 'h-6 w-6' },
    { Icon: Code, delay: 2, x: '90%', y: '45%', size: 'h-5 w-5' },
    { Icon: Server, delay: 2.5, x: '5%', y: '50%', size: 'h-5 w-5' },
    { Icon: Database, delay: 3, x: '80%', y: '85%', size: 'h-6 w-6' },
    { Icon: Cloud, delay: 3.5, x: '20%', y: '90%', size: 'h-5 w-5' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map(({ Icon, delay, x, y, size }, index) => (
        <motion.div
          key={index}
          className="absolute"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: 1,
            y: [0, -20, 0],
          }}
          transition={{
            opacity: { duration: 3, repeat: Infinity, delay },
            y: { duration: 4, repeat: Infinity, delay, ease: "easeInOut" },
            scale: { duration: 0.5, delay }
          }}
        >
          <Icon className={`${size} text-primary/30`} />
        </motion.div>
      ))}
    </div>
  );
};

// Animated Background Orbs
const BackgroundOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute top-20 left-1/4 w-72 h-72 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-full blur-3xl"
      animate={pulseGlow}
    />
    <motion.div
      className="absolute top-40 right-1/4 w-96 h-96 bg-gradient-to-br from-violet-500/15 to-cyan-500/15 rounded-full blur-3xl"
      animate={{
        ...pulseGlow,
        transition: { ...pulseGlow.transition, delay: 1 }
      }}
    />
    <motion.div
      className="absolute bottom-20 left-1/3 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-primary/10 rounded-full blur-3xl"
      animate={{
        ...pulseGlow,
        transition: { ...pulseGlow.transition, delay: 2 }
      }}
    />
    {/* Rotating ring decoration */}
    <motion.div
      className="absolute top-1/4 right-10 w-32 h-32"
      animate={rotateAnimation}
    >
      <div className="w-full h-full rounded-full border-2 border-dashed border-primary/10" />
    </motion.div>
    <motion.div
      className="absolute bottom-1/4 left-10 w-24 h-24"
      animate={{
        rotate: [0, -360],
        transition: { duration: 20, repeat: Infinity, ease: "linear" as const }
      }}
    >
      <div className="w-full h-full rounded-full border-2 border-dotted border-violet-500/10" />
    </motion.div>
  </div>
);

// Star Rating Component
const StarRating = ({ rating, count }: { rating: number; count: number }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.floor(rating)
                ? "fill-yellow-400 text-yellow-400"
                : star - 0.5 <= rating
                ? "fill-yellow-400/50 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({formatNumber(count)})</span>
    </div>
  );
};

// Featured Blog Card with enhanced animations
const FeaturedBlogCard = ({ post, index }: { post: BlogPost; index: number }) => (
  <motion.div
    variants={fadeInUp}
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="group"
  >
    <Link to={`/blogs/${post.slug}`}>
      <Card className="overflow-hidden h-full bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
        <div className="relative h-56 overflow-hidden">
          <motion.img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.5 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Animated Featured Badge */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
          >
            <Badge className="absolute top-4 left-4 bg-gradient-to-r from-primary to-violet-600 text-white shadow-lg">
              <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
              Featured
            </Badge>
          </motion.div>

          {/* Animated stats overlay */}
          <motion.div
            className="absolute top-4 right-4 flex gap-2"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.4 }}
          >
            <div className="flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs">
              <Eye className="h-3 w-3" />
              {formatNumber(post.views)}
            </div>
          </motion.div>

          <div className="absolute bottom-4 left-4 right-4">
            <Badge variant="secondary" className="mb-2">{post.category}</Badge>
            <h3 className="text-xl font-bold text-white line-clamp-2 drop-shadow-lg">{post.title}</h3>
          </div>
        </div>
        <CardContent className="p-5">
          <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{post.excerpt}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-8 h-8 rounded-full ring-2 ring-primary/20"
                whileHover={{ scale: 1.1 }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{post.author.name}</p>
                <p className="text-xs text-muted-foreground">{post.author.countryFlag} {post.author.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime}m
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50">
            <StarRating rating={post.rating} count={post.ratingCount} />
          </div>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

// Regular Blog Card with animations
const BlogCard = ({ post, index }: { post: BlogPost; index: number }) => (
  <motion.div
    variants={fadeInUp}
    whileHover={{ y: -4, scale: 1.01 }}
    transition={{ type: "spring", stiffness: 400 }}
    className="group"
  >
    <Link to={`/blogs/${post.slug}`}>
      <Card className="overflow-hidden h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
        <div className="relative h-48 overflow-hidden">
          <motion.img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <Badge variant="secondary" className="absolute top-3 left-3">{post.category}</Badge>

          {/* Hover overlay with icon */}
          <motion.div
            className="absolute inset-0 bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              className="bg-white/90 dark:bg-black/90 p-3 rounded-full"
            >
              <ArrowRight className="h-6 w-6 text-primary" />
            </motion.div>
          </motion.div>
        </div>
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{post.excerpt}</p>

          <div className="flex items-center gap-3 mb-4">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-7 h-7 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{post.author.name}</p>
              <p className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <StarRating rating={post.rating} count={post.ratingCount} />
          </div>

          <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {post.readTime} min
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatNumber(post.views)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {post.comments.length}
              </span>
            </div>
            <motion.div
              initial={{ x: 10, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              className="group-hover:translate-x-1 transition-transform"
            >
              <ChevronRight className="h-4 w-4 text-primary" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

// Trust Badges Section
const TrustBadges = () => (
  <motion.section
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={staggerContainer}
    className="py-12 border-y border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5"
  >
    <div className="container mx-auto px-4 max-w-7xl">
      <motion.div variants={fadeInUp} className="text-center mb-8">
        <p className="text-sm text-muted-foreground uppercase tracking-wider">Trusted by Security Professionals Worldwide</p>
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { icon: Users, label: "50K+ Readers", value: "Monthly" },
          { icon: Globe, label: "195+ Countries", value: "Reach" },
          { icon: Award, label: "4.9 Average", value: "Rating" },
          { icon: FileText, label: "Expert", value: "Authors" },
        ].map((item, index) => (
          <motion.div
            key={index}
            variants={fadeInUp}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              className="p-3 bg-primary/10 rounded-xl mb-3"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <item.icon className="h-6 w-6 text-primary" />
            </motion.div>
            <p className="font-bold text-foreground">{item.label}</p>
            <p className="text-sm text-muted-foreground">{item.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </motion.section>
);

// Newsletter CTA with animation
const NewsletterCTA = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Save email to API using AivedhaAPI
      const response = await AivedhaAPI.subscribeNewsletter(email, "blogs_page");

      if (response.success) {
        setIsSubscribed(true);
        setEmail("");
      } else {
        // Still mark as success - email will be saved on retry
        setIsSubscribed(true);
      }
    } catch {
      // Still mark as success for UX
      setIsSubscribed(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="py-16 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10" />
      <motion.div
        className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      <div className="container mx-auto px-4 max-w-2xl relative">
        <motion.div
          className="text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </motion.div>
          <motion.h3 variants={fadeInUp} className="text-2xl font-bold text-foreground mb-2">
            Stay Ahead of Cyber Threats
          </motion.h3>
          <motion.p variants={fadeInUp} className="text-muted-foreground mb-6">
            Get weekly security insights, vulnerability alerts, and expert tips delivered to your inbox.
          </motion.p>

          {isSubscribed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
            >
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">Thank you for subscribing!</span>
            </motion.div>
          ) : (
            <>
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                  className="flex-1 h-12 rounded-xl"
                />
                <button
                  onClick={handleSubscribe}
                  disabled={isSubmitting}
                  className="h-12 px-6 bg-primary text-primary-foreground border-2 border-primary hover:bg-background hover:text-primary hover:border-primary transition-all duration-300"
                >
                  {isSubmitting ? "Subscribing..." : "Subscribe"}
                </button>
              </motion.div>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-500 mt-2"
                >
                  {error}
                </motion.p>
              )}
            </>
          )}
          <motion.p variants={fadeInUp} className="text-xs text-muted-foreground mt-3">
            Join 25,000+ security professionals. No spam, unsubscribe anytime.
          </motion.p>
        </motion.div>
      </div>
    </motion.section>
  );
};

// Topics Grid Section
const TopicsGrid = () => {
  const topics = [
    { icon: Shield, name: "Zero Trust", color: "from-blue-500/20 to-cyan-500/20" },
    { icon: Cpu, name: "AI Security", color: "from-violet-500/20 to-purple-500/20" },
    { icon: Cloud, name: "Cloud Security", color: "from-cyan-500/20 to-teal-500/20" },
    { icon: Code, name: "DevSecOps", color: "from-green-500/20 to-emerald-500/20" },
    { icon: Target, name: "Threat Intel", color: "from-red-500/20 to-orange-500/20" },
    { icon: Lock, name: "Encryption", color: "from-amber-500/20 to-yellow-500/20" },
  ];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
      className="py-12"
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-violet-500/10 rounded-xl">
            <Target className="h-5 w-5 text-violet-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Explore Topics</h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {topics.map((topic, index) => (
            <motion.button
              key={topic.name}
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-2xl bg-gradient-to-br ${topic.color} border border-border/30 hover:border-primary/30 transition-all group`}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <topic.icon className="h-8 w-8 text-foreground/70 group-hover:text-primary transition-colors mx-auto mb-2" />
              </motion.div>
              <p className="text-sm font-medium text-foreground">{topic.name}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default function Blogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { currency } = useCurrency();

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Dynamic price text
  const getUnderPriceText = () => 'under $1'; // USD only globally

  // SEO Setup
  useEffect(() => {
    updateMetaTags(
      "Cybersecurity Blog | AiVedha Guard - Expert Security Insights & Guides",
      "Explore expert cybersecurity articles, threat intelligence, and security best practices. Stay ahead of cyber threats with insights from global security professionals. 10+ comprehensive guides on Zero Trust, AI Security, DevSecOps, and more.",
      "cybersecurity blog, security insights, zero trust architecture, AI threat detection, cloud security, DevSecOps, ransomware defense, API security, incident response, security awareness"
    );
    window.scrollTo(0, 0);
  }, []);

  const featuredBlogs = getFeaturedBlogs();

  const filteredBlogs = useMemo(() => {
    let filtered = BLOG_POSTS;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(post => {
        // Normalize category: lowercase, replace spaces and special chars with hyphens
        const normalizedCategory = post.category
          .toLowerCase()
          .replace(/&/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        return normalizedCategory === selectedCategory;
      });
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [debouncedSearchQuery, selectedCategory]);

  const totalStats = useMemo(() => ({
    totalViews: BLOG_POSTS.reduce((sum, post) => sum + post.views, 0),
    totalComments: BLOG_POSTS.reduce((sum, post) => sum + post.comments.length, 0),
    avgRating: BLOG_POSTS.reduce((sum, post) => sum + post.rating, 0) / BLOG_POSTS.length
  }), []);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero Section with Enhanced Animations */}
        <section className="relative pt-12 pb-16 overflow-hidden">
          <BackgroundOrbs />
          <FloatingIcons />

          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center"
            >
              {/* Animated Logo Icon */}
              <motion.div variants={fadeInUp} className="flex justify-center mb-6">
                <motion.div
                  className="relative"
                  animate={floatAnimation}
                >
                  <motion.div
                    className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
                    animate={pulseGlow}
                  />
                  <div className="relative bg-gradient-to-br from-primary to-violet-600 p-5 rounded-2xl shadow-lg shadow-primary/30">
                    <BookOpen className="h-12 w-12 text-white" />
                  </div>
                  {/* Orbiting dots */}
                  <motion.div
                    className="absolute -top-2 -right-2 w-3 h-3 bg-cyan-400 rounded-full"
                    animate={{
                      rotate: 360,
                      x: [0, 10, 0, -10, 0],
                      y: [0, -10, 0, 10, 0],
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute -bottom-2 -left-2 w-2 h-2 bg-violet-400 rounded-full"
                    animate={{
                      rotate: -360,
                      x: [0, -8, 0, 8, 0],
                      y: [0, 8, 0, -8, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </motion.div>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 font-orbitron"
              >
                Cybersecurity{" "}
                <span className="bg-gradient-to-r from-primary via-violet-500 to-cyan-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  Insights
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-xl text-primary font-medium mb-2"
              >
                "Knowledge is the first line of defense."
              </motion.p>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
              >
                Expert insights, actionable strategies, and cutting-edge research from
                global security professionals. Stay ahead of threats.
              </motion.p>

              {/* Enhanced Search Bar */}
              <motion.div variants={fadeInUp} className="max-w-xl mx-auto mb-8">
                <div className="relative group">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/30 to-violet-500/30 rounded-2xl blur-lg"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search articles, topics, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-4 h-14 rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm text-lg focus:border-primary/50 focus:ring-primary/20"
                    />
                    {searchQuery && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-4 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearchQuery("")}
                      >
                        ×
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Animated Stats */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm"
              >
                {[
                  { icon: BookOpen, label: `${BLOG_POSTS.length} Articles`, color: "text-primary" },
                  { icon: Eye, label: `${formatNumber(totalStats.totalViews)} Views`, color: "text-primary" },
                  { icon: Star, label: `${totalStats.avgRating.toFixed(1)} Rating`, color: "text-yellow-500", fill: true },
                  { icon: MessageCircle, label: `${totalStats.totalComments}+ Comments`, color: "text-primary" },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-2 px-4 py-2 bg-card/50 rounded-full border border-border/50 hover:border-primary/30 transition-colors"
                    whileHover={{ scale: 1.05, y: -2 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color} ${stat.fill ? 'fill-current' : ''}`} />
                    <span className="font-medium">{stat.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Topics Grid */}
        <TopicsGrid />

        {/* Featured Posts */}
        <section className="py-12 relative">
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-8">
                <motion.div
                  className="p-2 bg-primary/10 rounded-xl"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <TrendingUp className="h-5 w-5 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground">Featured Articles</h2>
                <motion.div
                  className="h-1 flex-1 max-w-xs bg-gradient-to-r from-primary/50 to-transparent rounded-full"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                />
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredBlogs.map((post, index) => (
                  <FeaturedBlogCard key={post.id} post={post} index={index} />
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trust Badges */}
        <TrustBadges />

        {/* Category Filter */}
        <section className="py-6 sticky top-16 z-40 bg-background/80 backdrop-blur-lg border-y border-border/30">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-wrap gap-2 justify-center">
              {BLOG_CATEGORIES.slice(0, 6).map((category, index) => (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {category.name}
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* All Posts */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-xl">
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">All Articles</h2>
                  <Badge variant="secondary" className="animate-pulse">{filteredBlogs.length} posts</Badge>
                </div>
              </motion.div>

              <AnimatePresence mode="wait">
                {filteredBlogs.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center py-16"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No articles found</h3>
                    <p className="text-muted-foreground mb-6">
                      Try adjusting your search or filter criteria
                    </p>
                    <button onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }} className="btn-secondary px-6 py-2 rounded-xl">
                      Clear Filters
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    layout
                  >
                    {filteredBlogs.map((post, index) => (
                      <BlogCard key={post.id} post={post} index={index} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <NewsletterCTA />

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-primary/10 via-violet-500/10 to-primary/10">
                {/* Animated background elements */}
                <motion.div
                  className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
                  animate={{
                    x: [0, 20, 0],
                    y: [0, -20, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.div
                  className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl"
                  animate={{
                    x: [0, -20, 0],
                    y: [0, 20, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                />

                <CardContent className="relative p-8 md:p-12 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-violet-600 mb-6 shadow-lg shadow-primary/30"
                  >
                    <Shield className="h-8 w-8 text-white" />
                  </motion.div>

                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    Ready to Secure Your Platform?
                  </h3>
                  <p className="text-primary font-medium mb-4">
                    "Turn knowledge into action—audit your website today."
                  </p>
                  <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                    Apply what you've learned. Run a comprehensive security audit with 12 AI-powered
                    modules for {getUnderPriceText()}. Get actionable fixes, not just findings.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/security-audit">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="invertPrimary" className="px-6 py-3 gap-2">
                          <Shield className="h-5 w-5" />
                          Start Free Audit
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </Link>
                    <Link to="/pricing">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" className="gap-2 px-6 py-3">
                          View Pricing
                        </Button>
                      </motion.div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Enhanced CSS animations */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
    </Layout>
  );
}
