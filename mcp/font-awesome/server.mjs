#!/usr/bin/env node
/**
 * Font Awesome MCP Server for IRANCOIN
 * =====================================
 * Provides:
 *  - Icon search (free icon set)
 *  - SVG icon retrieval with customization
 *  - Persian/Farsi typing animation configs
 *  - Icon animation presets
 *  - Brand icons for crypto
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================================
// FONT AWESOME API TOKENS
// ============================================================
const FA_TOKENS = {
  primary: "5AA38F74-A870-4ABC-895D-16005F22DB5A",
  secondary: "FB1017FF-7090-416E-8F7D-12245076FF6C",
};

// Font Awesome GraphQL API
const FA_API_URL = "https://api.fontawesome.com/graphql";

// ============================================================
// FETCH ICONS FROM FONT AWESOME API
// ============================================================
async function searchFAIcons(query, version = "5.15.4") {
  const token = FA_TOKENS.primary;
  const gql = `{ searchPaginated(query: "${query}", version: "${version}") { icons { id label } } }`;

  try {
    const response = await fetch(FA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "fa-kit-token": token,
      },
      body: JSON.stringify({ query: gql }),
    });
    const data = await response.json();
    return data?.data?.searchPaginated?.icons || [];
  } catch (e) {
    console.error("FA API search error:", e.message);
    return [];
  }
}

async function getFARelease(version = "5.15.4") {
  const token = FA_TOKENS.primary;
  const gql = `{ release(version: "${version}") { version } }`;

  try {
    const response = await fetch(FA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "fa-kit-token": token,
      },
      body: JSON.stringify({ query: gql }),
    });
    const data = await response.json();
    return data?.data?.release;
  } catch (e) {
    return null;
  }
}

// ============================================================
// FONT AWESOME FREE ICONS DATABASE
// ============================================================
const ICONS = {
  // Solid icons
  "chart-line": { type: "solid", unicode: "f201", keywords: ["graph", "analytics", "trend"] },
  "chart-bar": { type: "solid", unicode: "f080", keywords: ["bar", "analytics", "statistics"] },
  "chart-pie": { type: "solid", unicode: "f200", keywords: ["pie", "analytics", "data"] },
  "coins": { type: "solid", unicode: "f51e", keywords: ["money", "crypto", "currency"] },
  "money-bill-wave": { type: "solid", unicode: "f53a", keywords: ["cash", "payment", "dollar"] },
  "wallet": { type: "solid", unicode: "f555", keywords: ["money", "payment", "crypto"] },
  "credit-card": { type: "solid", unicode: "f09d", keywords: ["payment", "card", "visa"] },
  "shield-halved": { type: "solid", unicode: "f3ed", keywords: ["security", "protect", "safe"] },
  "lock": { type: "solid", unicode: "f023", keywords: ["security", "password", "protect"] },
  "bolt": { type: "solid", unicode: "f0e7", keywords: ["lightning", "fast", "speed"] },
  "rocket": { type: "solid", unicode: "f135", keywords: ["launch", "fast", "space"] },
  "brain": { type: "solid", unicode: "f5dc", keywords: ["ai", "intelligence", "neural"] },
  "robot": { type: "solid", unicode: "f544", keywords: ["ai", "bot", "automation"] },
  "microchip": { type: "solid", unicode: "f2db", keywords: ["cpu", "processor", "tech"] },
  "database": { type: "solid", unicode: "f1c0", keywords: ["storage", "data", "server"] },
  "cloud": { type: "solid", unicode: "f0c2", keywords: ["server", "hosting", "aws"] },
  "globe": { type: "solid", unicode: "f0ac", keywords: ["world", "internet", "web"] },
  "signal": { type: "solid", unicode: "f012", keywords: ["wifi", "connection", "network"] },
  "wifi": { type: "solid", unicode: "f1eb", keywords: ["internet", "connection", "wireless"] },
  "bell": { type: "solid", unicode: "f0f3", keywords: ["notification", "alert", "ring"] },
  "bell-concentrate": { type: "solid", unicode: "e2d9", keywords: ["notification", "alert", "focus"] },
  "star": { type: "solid", unicode: "f005", keywords: ["favorite", "rating", "gold"] },
  "heart": { type: "solid", unicode: "f004", keywords: ["love", "like", "favorite"] },
  "fire": { type: "solid", unicode: "f06d", keywords: ["hot", "trend", "popular"] },
  "gem": { type: "solid", unicode: "f3a5", keywords: ["diamond", "premium", "luxury"] },
  "crown": { type: "solid", unicode: "f521", keywords: ["king", "premium", "top"] },
  "trophy": { type: "solid", unicode: "f091", keywords: ["winner", "award", "prize"] },
  "medal": { type: "solid", unicode: "f5a2", keywords: ["award", "prize", "gold"] },
  "check-circle": { type: "solid", unicode: "f058", keywords: ["success", "done", "ok"] },
  "times-circle": { type: "solid", unicode: "f057", keywords: ["error", "close", "remove"] },
  "exclamation-triangle": { type: "solid", unicode: "f071", keywords: ["warning", "alert", "caution"] },
  "info-circle": { type: "solid", unicode: "f05a", keywords: ["info", "help", "about"] },
  "question-circle": { type: "solid", unicode: "f059", keywords: ["help", "faq", "question"] },
  "spinner": { type: "solid", unicode: "f110", keywords: ["loading", "wait", "progress"] },
  "sync": { type: "solid", unicode: "f021", keywords: ["refresh", "reload", "update"] },
  "redo": { type: "solid", unicode: "f01e", keywords: ["refresh", "repeat", "reload"] },
  "undo": { type: "solid", unicode: "f0e2", keywords: ["back", "return", "reverse"] },
  "play": { type: "solid", unicode: "f04b", keywords: ["start", "video", "music"] },
  "pause": { type: "solid", unicode: "f04c", keywords: ["stop", "wait", "hold"] },
  "stop": { type: "solid", unicode: "f04d", keywords: ["end", "halt", "freeze"] },
  "volume-up": { type: "solid", unicode: "f028", keywords: ["sound", "speaker", "audio"] },
  "volume-mute": { type: "solid", unicode: "f6a9", keywords: ["mute", "silent", "quiet"] },
  "music": { type: "solid", unicode: "f001", keywords: ["song", "audio", "note"] },
  "headphones": { type: "solid", unicode: "f025", keywords: ["audio", "listen", "music"] },
  "camera": { type: "solid", unicode: "f030", keywords: ["photo", "picture", "image"] },
  "video": { type: "solid", unicode: "f03d", keywords: ["film", "movie", "record"] },
  "image": { type: "solid", unicode: "f03e", keywords: ["photo", "picture", "gallery"] },
  "paint-brush": { type: "solid", unicode: "f1fc", keywords: ["design", "art", "color"] },
  "palette": { type: "solid", unicode: "f53f", keywords: ["color", "design", "theme"] },
  "magic": { type: "solid", unicode: "f0d3", keywords: ["wand", "auto", "ai"] },
  "wand-magic-sparkles": { type: "solid", unicode: "e2ca", keywords: ["ai", "magic", "auto"] },
  "thumbtack": { type: "solid", unicode: "f08d", keywords: ["pin", "fix", "attach"] },
  "bullseye": { type: "solid", unicode: "f140", keywords: ["target", "goal", "aim"] },
  "crosshairs": { type: "solid", unicode: "f05b", keywords: ["target", "aim", "focus"] },
  "eye": { type: "solid", unicode: "f06e", keywords: ["view", "watch", "see"] },
  "eye-slash": { type: "solid", unicode: "f070", keywords: ["hidden", "hide", "blind"] },
  "search": { type: "solid", unicode: "f002", keywords: ["find", "look", "magnify"] },
  "filter": { type: "solid", unicode: "f0b0", keywords: ["sort", "funnel", "refine"] },
  "sort": { type: "solid", unicode: "f0dc", keywords: ["order", "arrange", "rank"] },
  "sliders-h": { type: "solid", unicode: "f1de", keywords: ["settings", "adjust", "control"] },
  "cog": { type: "solid", unicode: "f013", keywords: ["gear", "settings", "config"] },
  "cogs": { type: "solid", unicode: "f085", keywords: ["gears", "settings", "config"] },
  "wrench": { type: "solid", unicode: "f0ad", keywords: ["tool", "fix", "repair"] },
  "hammer": { type: "solid", unicode: "f6e3", keywords: ["tool", "build", "fix"] },
  "key": { type: "solid", unicode: "f084", keywords: ["password", "access", "login"] },
  "fingerprint": { type: "solid", unicode: "f577", keywords: ["biometric", "scan", "id"] },
  "id-card": { type: "solid", unicode: "f577", keywords: ["badge", "identity", "user"] },
  "user": { type: "solid", unicode: "f007", keywords: ["person", "account", "profile"] },
  "users": { type: "solid", unicode: "f0c0", keywords: ["people", "group", "team"] },
  "user-check": { type: "solid", unicode: "f4fc", keywords: ["verified", "approved", "valid"] },
  "user-shield": { type: "solid", unicode: "f505", keywords: ["admin", "protect", "security"] },
  "user-clock": { type: "solid", unicode: "e4e4", keywords: ["time", "schedule", "pending"] },
  "clock": { type: "solid", unicode: "f017", keywords: ["time", "watch", "schedule"] },
  "hourglass-half": { type: "solid", unicode: "f252", keywords: ["time", "loading", "wait"] },
  "calendar": { type: "solid", unicode: "f133", keywords: ["date", "schedule", "event"] },
  "calendar-check": { type: "solid", unicode: "f274", keywords: ["event", "confirmed", "booked"] },
  "map-marker-alt": { type: "solid", unicode: "f3c5", keywords: ["location", "place", "pin"] },
  "compass": { type: "solid", unicode: "f14e", keywords: ["direction", "navigate", "explore"] },
  "road": { type: "solid", unicode: "f181", keywords: ["path", "journey", "track"] },
  "flag": { type: "solid", unicode: "f024", keywords: ["report", "mark", "country"] },
  "flag-checkered": { type: "solid", unicode: "f11e", keywords: ["finish", "race", "end"] },
  "bookmark": { type: "solid", unicode: "f02e", keywords: ["save", "favorite", "tag"] },
  "tag": { type: "solid", unicode: "f02b", keywords: ["label", "price", "category"] },
  "tags": { type: "solid", unicode: "f02c", keywords: ["labels", "prices", "categories"] },
  "link": { type: "solid", unicode: "f0c1", keywords: ["chain", "url", "href"] },
  "unlink": { type: "solid", unicode: "f127", keywords: ["chain", "remove", "disconnect"] },
  "paperclip": { type: "solid", unicode: "f0c6", keywords: ["attach", "file", "clip"] },
  "share": { type: "solid", unicode: "f064", keywords: ["social", "send", "forward"] },
  "share-alt": { type: "solid", unicode: "f1e0", keywords: ["social", "send", "forward"] },
  "copy": { type: "solid", unicode: "f0c5", keywords: ["duplicate", "clone", "paste"] },
  "clipboard": { type: "solid", unicode: "f328", keywords: ["paste", "copy", "board"] },
  "download": { type: "solid", unicode: "f019", keywords: ["save", "get", "export"] },
  "upload": { type: "solid", unicode: "f093", keywords: ["send", "import", "send"] },
  "arrow-up": { type: "solid", unicode: "f062", keywords: ["up", "increase", "top"] },
  "arrow-down": { type: "solid", unicode: "f063", keywords: ["down", "decrease", "bottom"] },
  "arrow-right": { type: "solid", unicode: "f061", keywords: ["next", "forward", "proceed"] },
  "arrow-left": { type: "solid", unicode: "f060", keywords: ["back", "previous", "return"] },
  "chevron-up": { type: "solid", unicode: "f077", keywords: ["up", "expand", "more"] },
  "chevron-down": { type: "solid", unicode: "f078", keywords: ["down", "collapse", "less"] },
  "chevron-right": { type: "solid", unicode: "f054", keywords: ["next", "forward", "more"] },
  "chevron-left": { type: "solid", unicode: "f053", keywords: ["back", "previous", "less"] },
  "caret-up": { type: "solid", unicode: "f0d8", keywords: ["up", "increase"] },
  "caret-down": { type: "solid", unicode: "f0d7", keywords: ["down", "decrease"] },
  "caret-right": { type: "solid", unicode: "f0da", keywords: ["play", "forward"] },
  "caret-left": { type: "solid", unicode: "f0d9", keywords: ["back", "reverse"] },
  "plus": { type: "solid", unicode: "f067", keywords: ["add", "new", "create"] },
  "minus": { type: "solid", unicode: "f068", keywords: ["remove", "delete", "subtract"] },
  "times": { type: "solid", unicode: "f00d", keywords: ["close", "remove", "delete"] },
  "check": { type: "solid", unicode: "f00c", keywords: ["ok", "done", "success"] },
  "plus-circle": { type: "solid", unicode: "f055", keywords: ["add", "new", "create"] },
  "minus-circle": { type: "solid", unicode: "f056", keywords: ["remove", "delete", "subtract"] },
  "check-circle": { type: "solid", unicode: "f058", keywords: ["success", "done", "ok"] },
  "times-circle": { type: "solid", unicode: "f057", keywords: ["error", "close", "remove"] },
  "edit": { type: "solid", unicode: "f303", keywords: ["write", "pencil", "modify"] },
  "trash": { type: "solid", unicode: "f2ed", keywords: ["delete", "remove", "bin"] },
  "trash-alt": { type: "solid", unicode: "f2ed", keywords: ["delete", "remove", "bin"] },
  "save": { type: "solid", unicode: "f0c7", keywords: ["floppy", "store", "keep"] },
  "folder": { type: "solid", unicode: "f07b", keywords: ["directory", "group", "organize"] },
  "folder-open": { type: "solid", unicode: "f07c", keywords: ["directory", "view", "browse"] },
  "file": { type: "solid", unicode: "f15b", keywords: ["document", "page", "paper"] },
  "file-alt": { type: "solid", unicode: "f15c", keywords: ["document", "text", "page"] },
  "file-pdf": { type: "solid", unicode: "f1c1", keywords: ["document", "pdf", "export"] },
  "file-image": { type: "solid", unicode: "f1c5", keywords: ["image", "picture", "photo"] },
  "file-code": { type: "solid", unicode: "f1c9", keywords: ["code", "html", "programming"] },
  "home": { type: "solid", unicode: "f015", keywords: ["house", "main", "dashboard"] },
  "building": { type: "solid", unicode: "f1ad", keywords: ["office", "company", "business"] },
  "store": { type: "solid", unicode: "f54e", keywords: ["shop", "market", "commerce"] },
  "shopping-cart": { type: "solid", unicode: "f07a", keywords: ["buy", "purchase", "ecommerce"] },
  "shopping-bag": { type: "solid", unicode: "f290", keywords: ["buy", "purchase", "ecommerce"] },
  "gift": { type: "solid", unicode: "f06b", keywords: ["present", "reward", "bonus"] },
  "percentage": { type: "solid", unicode: "f541", keywords: ["percent", "discount", "off"] },
  "balance-scale": { type: "solid", unicode: "f24e", keywords: ["weight", "compare", "balance"] },
  "scale-balanced": { type: "solid", unicode: "f24e", keywords: ["weight", "compare", "balance"] },
  "chart-line": { type: "solid", unicode: "f201", keywords: ["graph", "analytics", "trend"] },
  "chart-area": { type: "solid", unicode: "f1fe", keywords: ["graph", "area", "analytics"] },
  "tachometer-alt": { type: "solid", unicode: "f3fd", keywords: ["speed", "gauge", "dashboard"] },
  "tachometer-alt-fast": { type: "solid", unicode: "f3fd", keywords: ["speed", "fast", "gauge"] },
  "heartbeat": { type: "solid", unicode: "f21e", keywords: ["pulse", "health", "vital"] },
  "activity": { type: "solid", unicode: "f0fe", keywords: ["pulse", "graph", "vital"] },
  "exclamation-circle": { type: "solid", unicode: "f06a", keywords: ["alert", "warning", "error"] },
  "check-double": { type: "solid", unicode: "f560", keywords: ["verified", "done", "confirmed"] },
  "shield": { type: "solid", unicode: "f132", keywords: ["security", "protect", "safe"] },
  "shield-alt": { type: "solid", unicode: "f3ed", keywords: ["security", "protect", "safe"] },
  "lock-open": { type: "solid", unicode: "f3c1", keywords: ["unlock", "access", "open"] },
  "key-skeleton": { type: "solid", unicode: "e4e5", keywords: ["password", "access", "key"] },
  "fingerprint": { type: "solid", unicode: "f577", keywords: ["biometric", "scan", "id"] },
  "eye": { type: "solid", unicode: "f06e", keywords: ["view", "watch", "see"] },
  "eye-dropper": { type: "solid", unicode: "f1fb", keywords: ["color", "pick", "design"] },
  "magnifying-glass": { type: "solid", unicode: "f002", keywords: ["search", "find", "look"] },
  "binoculars": { type: "solid", unicode: "f1e5", keywords: ["search", "view", "explore"] },
  "layer-group": { type: "solid", unicode: "f5fd", keywords: ["stack", "layers", "overlap"] },
  "objects-group": { type: "solid", unicode: "f84d", keywords: ["group", "arrange", "organize"] },
  "object-group": { type: "solid", unicode: "f846", keywords: ["group", "arrange", "organize"] },
  "clone": { type: "solid", unicode: "f24d", keywords: ["copy", "duplicate", "paste"] },
  "shapes": { type: "solid", unicode: "e1f3", keywords: ["shapes", "design", "objects"] },
  "draw-polygon": { type: "solid", unicode: "f5ee", keywords: ["shape", "polygon", "design"] },
  "bezier-curve": { type: "solid", unicode: "f55b", keywords: ["path", "vector", "design"] },
  "vector-square": { type: "solid", unicode: "f5cb", keywords: ["shape", "square", "design"] },
  "sun": { type: "solid", unicode: "f185", keywords: ["light", "day", "bright"] },
  "moon": { type: "solid", unicode: "f186", keywords: ["dark", "night", "theme"] },
  "cloud-sun": { type: "solid", unicode: "f0c3", keywords: ["weather", "day", "partly"] },
  "cloud-moon": { type: "solid", unicode: "f6c4", keywords: ["weather", "night", "partly"] },
  "star-half-alt": { type: "solid", unicode: "f5c0", keywords: ["rating", "half", "star"] },
  "snowflake": { type: "solid", unicode: "f2dc", keywords: ["cold", "winter", "ice"] },
  "fire-alt": { type: "solid", unicode: "f7e4", keywords: ["hot", "fire", "flame"] },
  "water": { type: "solid", unicode: "f043", keywords: ["liquid", "drop", "fluid"] },
  "seedling": { type: "solid", unicode: "f4d8", keywords: ["plant", "grow", "eco"] },
  "leaf": { type: "solid", unicode: "f06c", keywords: ["plant", "eco", "nature"] },
  "tree": { type: "solid", unicode: "1bb", keywords: ["nature", "eco", "plant"] },
  "bug": { type: "solid", unicode: "f188", keywords: ["error", "debug", "insect"] },
  "laptop-code": { type: "solid", unicode: "f5fc", keywords: ["computer", "dev", "code"] },
  "terminal": { type: "solid", unicode: "f120", keywords: ["console", "code", "command"] },
  "code": { type: "solid", unicode: "f121", keywords: ["programming", "html", "dev"] },
  "code-branch": { type: "solid", unicode: "f126", keywords: ["git", "branch", "version"] },
  "code-commit": { type: "solid", unicode: "f386", keywords: ["git", "commit", "version"] },
  "code-pull-request": { type: "solid", unicode: "f386", keywords: ["git", "pr", "merge"] },
  "server": { type: "solid", unicode: "f233", keywords: ["hosting", "backend", "deploy"] },
  "hdd": { type: "solid", unicode: "f0a0", keywords: ["storage", "disk", "drive"] },
  "memory": { type: "solid", unicode: "f538", keywords: ["ram", "chip", "hardware"] },
  "microchip": { type: "solid", unicode: "f2db", keywords: ["cpu", "processor", "chip"] },
  "network-wired": { type: "solid", unicode: "f6ff", keywords: ["lan", "ethernet", "cable"] },
  "ethernet": { type: "solid", unicode: "e4e4", keywords: ["lan", "cable", "network"] },
  "sim-card": { type: "solid", unicode: "f7c4", keywords: ["sim", "card", "mobile"] },
  "sd-card": { type: "solid", unicode: "f7c2", keywords: ["storage", "memory", "card"] },
  "usb": { type: "solid", unicode: "f287", keywords: ["connection", "port", "device"] },
  "print": { type: "solid", unicode: "f02f", keywords: ["printer", "paper", "output"] },
  "at": { type: "solid", unicode: "f1fa", keywords: ["email", "address", "mention"] },
  "envelope": { type: "solid", unicode: "f0e0", keywords: ["email", "mail", "message"] },
  "envelope-open": { type: "solid", unicode: "f2b6", keywords: ["email", "mail", "read"] },
  "comment": { type: "solid", unicode: "f075", keywords: ["message", "chat", "talk"] },
  "comments": { type: "solid", unicode: "f086", keywords: ["messages", "chat", "talk"] },
  "comment-dots": { type: "solid", unicode: "f4ad", keywords: ["message", "typing", "chat"] },
  "inbox": { type: "solid", unicode: "f01c", keywords: ["email", "mail", "receive"] },
  "paper-plane": { type: "solid", unicode: "f1d8", keywords: ["send", "email", "submit"] },
  "phone": { type: "solid", unicode: "f095", keywords: ["call", "mobile", "contact"] },
  "phone-alt": { type: "solid", unicode: "f879", keywords: ["call", "mobile", "contact"] },
  "video-slash": { type: "solid", unicode: "f4e2", keywords: ["mute", "camera", "off"] },
  "microphone": { type: "solid", unicode: "f130", keywords: ["record", "audio", "speak"] },
  "microphone-slash": { type: "solid", unicode: "f131", keywords: ["mute", "silent", "off"] },
  "podcast": { type: "solid", unicode: "f2ce", keywords: ["audio", "show", "broadcast"] },
  "rss": { type: "solid", unicode: "f09e", keywords: ["feed", "news", "subscribe"] },
  "podium": { type: "solid", unicode: "f500", keywords: ["speech", "stage", "conference"] },
  "bullhorn": { type: "solid", unicode: "f0a1", keywords: ["megaphone", "announce", "loud"] },
  "volume-down": { type: "solid", unicode: "f027", keywords: ["sound", "quiet", "low"] },
  "ear-listen": { type: "solid", unicode: "f2a2", keywords: ["hearing", "accessibility", "sound"] },
  "closed-captioning": { type: "solid", unicode: "f20a", keywords: ["subtitle", "text", "accessibility"] },
  "language": { type: "solid", unicode: "f1ab", keywords: ["translate", "globe", "world"] },
  "globe-americas": { type: "solid", unicode: "f072", keywords: ["world", "america", "globe"] },
  "globe-europe": { type: "solid", unicode: "f7a2", keywords: ["world", "europe", "globe"] },
  "globe-asia": { type: "solid", unicode: "f57d", keywords: ["world", "asia", "globe"] },
  "map": { type: "solid", unicode: "f279", keywords: ["location", "geography", "world"] },
  "map-marked-alt": { type: "solid", unicode: "f5a0", keywords: ["location", "pin", "place"] },
  "directions": { type: "solid", unicode: "f5eb", keywords: ["navigate", "route", "path"] },
  "route": { type: "solid", unicode: "f4d7", keywords: ["path", "road", "direction"] },
  "car": { type: "solid", unicode: "f1b9", keywords: ["auto", "vehicle", "drive"] },
  "bus": { type: "solid", unicode: "f207", keywords: ["transport", "vehicle", "public"] },
  "train": { type: "solid", unicode: "f238", keywords: ["rail", "transport", "public"] },
  "plane": { type: "solid", unicode: "f072", keywords: ["fly", "air", "travel"] },
  "ship": { type: "solid", unicode: "f5a3", keywords: ["boat", "sea", "transport"] },
  "motorcycle": { type: "solid", unicode: "f524", keywords: ["bike", "ride", "vehicle"] },
  "bicycle": { type: "solid", unicode: "f206", keywords: ["bike", "ride", "eco"] },
  "walking": { type: "solid", unicode: "f554", keywords: ["pedestrian", "foot", "walk"] },
  "running": { type: "solid", unicode: "f70c", keywords: ["sprint", "fast", "athlete"] },
  "swimmer": { type: "solid", unicode: "f5c4", keywords: ["water", "swim", "sport"] },
  "umbrella": { type: "solid", unicode: "f0e9", keywords: ["rain", "weather", "protect"] },
  "life-ring": { type: "solid", unicode: "f1cd", keywords: ["help", "support", "rescue"] },
  "hands-helping": { type: "solid", unicode: "f4c4", keywords: ["help", "charity", "support"] },
  "hand-holding-heart": { type: "solid", unicode: "f4be", keywords: ["help", "care", "love"] },
  "hand-holding-usd": { type: "solid", unicode: "f4c0", keywords: ["money", "donate", "help"] },
  "donate": { type: "solid", unicode: "f4b9", keywords: ["money", "charity", "give"] },
  "globe-americas": { type: "solid", unicode: "f072", keywords: ["world", "america", "globe"] },
  "passport": { type: "solid", unicode: "f5ab", keywords: ["travel", "identity", "document"] },
  "id-card": { type: "solid", unicode: "f2c2", keywords: ["badge", "identity", "user"] },
  "address-card": { type: "solid", unicode: "f2bb", keywords: ["contact", "card", "address"] },
  "qrcode": { type: "solid", unicode: "f029", keywords: ["scan", "code", "barcode"] },
  "barcode": { type: "solid", unicode: "f02a", keywords: ["scan", "code", "product"] },
  "thumbtack": { type: "solid", unicode: "f08d", keywords: ["pin", "fix", "attach"] },
  "thumbtack-slash": { type: "solid", unicode: "e687", keywords: ["unpin", "detach", "remove"] },
  "hashtag": { type: "solid", unicode: "f292", keywords: ["tag", "social", "twitter"] },
  "at": { type: "solid", unicode: "f1fa", keywords: ["email", "mention", "address"] },
  "asterisk": { type: "solid", unicode: "f069", keywords: ["star", "important", "required"] },
  "ellipsis-h": { type: "solid", unicode: "f141", keywords: ["more", "dots", "overflow"] },
  "ellipsis-v": { type: "solid", unicode: "f142", keywords: ["more", "dots", "overflow"] },
  "bars": { type: "solid", unicode: "f0c9", keywords: ["menu", "hamburger", "nav"] },
  "list": { type: "solid", unicode: "f03a", keywords: ["menu", "items", "lines"] },
  "list-ol": { type: "solid", unicode: "f0cb", keywords: ["ordered", "list", "items"] },
  "list-ul": { type: "solid", unicode: "f0ca", keywords: ["unordered", "list", "items"] },
  "table": { type: "solid", unicode: "f0ce", keywords: ["grid", "data", "spreadsheet"] },
  "th": { type: "solid", unicode: "f00a", keywords: ["grid", "small", "tiles"] },
  "th-large": { type: "solid", unicode: "f009", keywords: ["grid", "large", "tiles"] },
  "th-list": { type: "solid", unicode: "f00b", keywords: ["list", "detail", "view"] },
  "chart-simple": { type: "solid", unicode: "e1e3", keywords: ["bar", "analytics", "data"] },
  "chart-pie": { type: "solid", unicode: "f200", keywords: ["pie", "analytics", "data"] },
  "chart-column": { type: "solid", unicode: "e1e5", keywords: ["bar", "analytics", "data"] },
  "chart-bar": { type: "solid", unicode: "f080", keywords: ["bar", "analytics", "statistics"] },
  "chart-line": { type: "solid", unicode: "f201", keywords: ["graph", "analytics", "trend"] },
  "chart-area": { type: "solid", unicode: "f1fe", keywords: ["graph", "area", "analytics"] },
  "chart-scatter": { type: "solid", unicode: "f7ee", keywords: ["graph", "scatter", "data"] },
  "chart-gantt": { type: "solid", unicode: "e1e4", keywords: ["timeline", "project", "plan"] },
  "chart-radar": { type: "solid", unicode: "e1e6", keywords: ["radar", "analytics", "data"] },
  "chart-net": { type: "solid", unicode: "e1e7", keywords: ["network", "graph", "data"] },
  "chart-ring": { type: "solid", unicode: "e1e8", keywords: ["ring", "donut", "data"] },
  "chart-scatter-bubble": { type: "solid", unicode: "e1e9", keywords: ["bubble", "scatter", "data"] },
  "chart-simple-horizontal": { type: "solid", unicode: "e1ea", keywords: ["bar", "horizontal", "data"] },
  "chart-mixed": { type: "solid", unicode: "f201", keywords: ["mixed", "analytics", "data"] },
  "chart-mixed-up-circle-candy": { type: "solid", unicode: "e1eb", keywords: ["candy", "analytics", "data"] },
  "chart-mixed-up-circle-dollar": { type: "solid", unicode: "e1ec", keywords: ["dollar", "analytics", "data"] },
  "chart-mixed-up-currency": { type: "solid", unicode: "e1ed", keywords: ["currency", "analytics", "data"] },
  "chart-mixed-up-russian-ruble": { type: "solid", unicode: "e1ee", keywords: ["ruble", "analytics", "data"] },
  "chart-mixed-up-turkish-lira": { type: "solid", unicode: "e1ef", keywords: ["lira", "analytics", "data"] },
  "chart-mixed-up-yen-yuan": { type: "solid", unicode: "e1f0", keywords: ["yen", "analytics", "data"] },
  "chart-mixed-up-yuan-yen": { type: "solid", unicode: "e1f1", keywords: ["yuan", "analytics", "data"] },
  "chart-mixed-up-yuan-yen-dollar": { type: "solid", unicode: "e1f2", keywords: ["yuan", "analytics", "data"] },
};

// ============================================================
// ICON ANIMATION PRESETS
// ============================================================
const ANIMATIONS = {
  "pulse": {
    name: "Pulse",
    css: "animation: pulse 2s ease-in-out infinite;",
    keyframes: "@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }",
    description: "Gentle pulsing scale effect"
  },
  "bounce": {
    name: "Bounce",
    css: "animation: bounce 1s ease infinite;",
    keyframes: "@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }",
    description: "Bouncing up and down"
  },
  "shake": {
    name: "Shake",
    css: "animation: shake 0.5s ease-in-out infinite;",
    keyframes: "@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }",
    description: "Horizontal shaking"
  },
  "spin": {
    name: "Spin",
    css: "animation: spin 2s linear infinite;",
    keyframes: "@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }",
    description: "Continuous rotation"
  },
  "fade-in": {
    name: "Fade In",
    css: "animation: fadeIn 1s ease-in forwards;",
    keyframes: "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }",
    description: "Fade in from transparent"
  },
  "slide-up": {
    name: "Slide Up",
    css: "animation: slideUp 0.5s ease-out forwards;",
    keyframes: "@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }",
    description: "Slide up from below"
  },
  "slide-down": {
    name: "Slide Down",
    css: "animation: slideDown 0.5s ease-out forwards;",
    keyframes: "@keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }",
    description: "Slide down from above"
  },
  "slide-left": {
    name: "Slide Left",
    css: "animation: slideLeft 0.5s ease-out forwards;",
    keyframes: "@keyframes slideLeft { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }",
    description: "Slide in from right"
  },
  "slide-right": {
    name: "Slide Right",
    css: "animation: slideRight 0.5s ease-out forwards;",
    keyframes: "@keyframes slideRight { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }",
    description: "Slide in from left"
  },
  "flip": {
    name: "Flip",
    css: "animation: flip 1s ease-in-out;",
    keyframes: "@keyframes flip { from { transform: perspective(400px) rotateY(0); } to { transform: perspective(400px) rotateY(360deg); } }",
    description: "3D flip rotation"
  },
  "rubber-band": {
    name: "Rubber Band",
    css: "animation: rubberBand 1s ease;",
    keyframes: "@keyframes rubberBand { 0% { transform: scale(1); } 30% { transform: scaleX(1.25) scaleY(0.75); } 40% { transform: scaleX(0.75) scaleY(1.25); } 50% { transform: scaleX(1.15) scaleY(0.85); } 65% { transform: scaleX(0.95) scaleY(1.05); } 75% { transform: scaleX(1.05) scaleY(0.95); } 100% { transform: scale(1); } }",
    description: "Rubber band stretching effect"
  },
  "jello": {
    name: "Jello",
    css: "animation: jello 1s ease;",
    keyframes: "@keyframes jello { 0% { transform: skewX(0) skewY(0); } 30% { transform: skewX(-12.5deg) skewY(-12.5deg); } 40% { transform: skewX(6.25deg) skewY(6.25deg); } 50% { transform: skewX(-3.125deg) skewY(-3.125deg); } 65% { transform: skewX(1.5625deg) skewY(1.5625deg); } 75% { transform: skewX(-0.78125deg) skewY(-0.78125deg); } 100% { transform: skewX(0) skewY(0); } }",
    description: "Jello wobble effect"
  },
  "tada": {
    name: "Tada",
    css: "animation: tada 1s ease;",
    keyframes: "@keyframes tada { 0% { transform: scale(1) rotate(0); } 10%, 20% { transform: scale(0.9) rotate(-3deg); } 30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); } 40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); } 100% { transform: scale(1) rotate(0); } }",
    description: "Tada celebration effect"
  },
  "flash": {
    name: "Flash",
    css: "animation: flash 1.5s ease infinite;",
    keyframes: "@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }",
    description: "Flashing opacity"
  },
  "glow": {
    name: "Glow",
    css: "animation: glow 2s ease-in-out infinite alternate;",
    keyframes: "@keyframes glow { from { filter: drop-shadow(0 0 5px currentColor); } to { filter: drop-shadow(0 0 20px currentColor); } }",
    description: "Glowing shadow effect"
  },
  "float": {
    name: "Float",
    css: "animation: float 3s ease-in-out infinite;",
    keyframes: "@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }",
    description: "Floating up and down"
  },
  "swing": {
    name: "Swing",
    css: "animation: swing 2s ease-in-out infinite; transform-origin: top center;",
    keyframes: "@keyframes swing { 20% { transform: rotate(15deg); } 40% { transform: rotate(-10deg); } 60% { transform: rotate(5deg); } 80% { transform: rotate(-5deg); } 100% { transform: rotate(0); } }",
    description: "Swinging pendulum effect"
  },
  "wobble": {
    name: "Wobble",
    css: "animation: wobble 1s ease;",
    keyframes: "@keyframes wobble { 0% { transform: translateX(0); } 15% { transform: translateX(-25px) rotate(-5deg); } 30% { transform: translateX(20px) rotate(3deg); } 45% { transform: translateX(-15px) rotate(-3deg); } 60% { transform: translateX(10px) rotate(2deg); } 75% { transform: translateX(-5px) rotate(-1deg); } 100% { transform: translateX(0); } }",
    description: "Wobbling side to side"
  },
  "heart-beat": {
    name: "Heart Beat",
    css: "animation: heartBeat 1.5s ease-in-out infinite;",
    keyframes: "@keyframes heartBeat { 0% { transform: scale(1); } 14% { transform: scale(1.3); } 28% { transform: scale(1); } 42% { transform: scale(1.3); } 70% { transform: scale(1); } }",
    description: "Heartbeat pulsing"
  },
  "typing": {
    name: "Typing",
    css: "animation: typing 3.5s steps(40, end);",
    keyframes: "@keyframes typing { from { width: 0; } to { width: 100%; } }",
    description: "Typewriter text effect"
  },
};

// ============================================================
// PERSIAN/FARSI TYPING CONFIGS
// ============================================================
const FARSI_TYPING = {
  "standard": {
    name: "Standard Farsi Typing",
    direction: "rtl",
    fontFamily: "Vazirmatn, Tahoma, Arial",
    animation: "typing-farsi",
    keyframes: `@keyframes typing-farsi {
  from { width: 0; }
  to { width: 100%; }
}`,
    cursor: "border-right: 2px solid currentColor;",
    description: "Standard RTL typing animation for Persian text"
  },
  "flicker": {
    name: "Farsi Flicker Typing",
    direction: "rtl",
    fontFamily: "Vazirmatn, Tahoma, Arial",
    animation: "flicker-typing",
    keyframes: `@keyframes flicker-typing {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}`,
    cursor: "border-right: 2px solid currentColor; animation: blink 0.7s step-end infinite;",
    description: "Farsi typing with flickering cursor"
  },
  "glow-typing": {
    name: "Farsi Glow Typing",
    direction: "rtl",
    fontFamily: "Vazirmatn, Tahoma, Arial",
    animation: "glow-farsi",
    keyframes: `@keyframes glow-farsi {
  from { text-shadow: 0 0 5px currentColor; width: 0; }
  to { text-shadow: 0 0 20px currentColor; width: 100%; }
}`,
    cursor: "border-right: 2px solid currentColor;",
    description: "Farsi typing with glowing text effect"
  },
  "neon": {
    name: "Farsi Neon Typing",
    direction: "rtl",
    fontFamily: "Vazirmatn, Tahoma, Arial",
    animation: "neon-farsi",
    keyframes: `@keyframes neon-farsi {
  from { text-shadow: 0 0 5px #7c3aed, 0 0 10px #7c3aed; width: 0; }
  to { text-shadow: 0 0 10px #7c3aed, 0 0 20px #7c3aed, 0 0 40px #7c3aed; width: 100%; }
}`,
    cursor: "border-right: 2px solid #7c3aed;",
    description: "Farsi typing with neon glow effect"
  },
  "cyber": {
    name: "Farsi Cyber Typing",
    direction: "rtl",
    fontFamily: "Vazirmatn, Tahoma, Arial",
    animation: "cyber-farsi",
    keyframes: `@keyframes cyber-farsi {
  0% { text-shadow: 0 0 5px #22d3ee; width: 0; }
  50% { text-shadow: 0 0 15px #22d3ee, 0 0 30px #7c3aed; }
  100% { text-shadow: 0 0 10px #22d3ee, 0 0 20px #7c3aed; width: 100%; }
}`,
    cursor: "border-right: 2px solid #22d3ee;",
    description: "Farsi typing with cyber/tech glow"
  },
};

// ============================================================
// MCP SERVER
// ============================================================
const server = new McpServer({
  name: "font-awesome-irancoin",
  version: "1.0.0",
});

// ============================================================
// TOOL: search_icons
// ============================================================
server.tool(
  "search_icons",
  "Search Font Awesome icons by keyword (API + local database)",
  {
    query: z.string().describe("Search keyword (e.g. 'chart', 'lock', 'money')"),
    limit: z.number().optional().describe("Max results (default 10)"),
    useApi: z.boolean().optional().describe("Search via Font Awesome API (default: true)"),
  },
  async ({ query, limit, useApi }) => {
    const max = limit || 10;
    const q = query.toLowerCase();

    let results = [];

    // Try API first
    if (useApi !== false) {
      const apiIcons = await searchFAIcons(query);
      results = apiIcons.slice(0, max).map(icon => ({
        name: icon.id.split(":").pop(),
        label: icon.label,
        html: `<i class="fas fa-${icon.id.split(":").pop()}"></i>`,
        source: "api",
      }));
    }

    // Fallback to local database
    if (results.length === 0) {
      results = Object.entries(ICONS)
        .filter(([name, icon]) =>
          name.includes(q) || icon.keywords.some(k => k.includes(q))
        )
        .slice(0, max)
        .map(([name, icon]) => ({
          name,
          type: icon.type,
          unicode: `&#x${icon.unicode};`,
          html: `<i class="fas fa-${name}"></i>`,
          keywords: icon.keywords,
          source: "local",
        }));
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ query, count: results.length, results }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: get_icon_svg
// ============================================================
server.tool(
  "get_icon_svg",
  "Get SVG code for a Font Awesome icon with customization (fetches from Font Awesome API)",
  {
    icon: z.string().describe("Icon name (e.g. 'chart-line', 'lock')"),
    style: z.string().optional().describe("Icon style: 'solid', 'regular', 'light', 'thin', 'duotone' (default: 'solid')"),
    size: z.number().optional().describe("Size in px (default 24)"),
    color: z.string().optional().describe("Color hex or CSS color (default: currentColor)"),
    animation: z.string().optional().describe("Animation preset name"),
  },
  async ({ icon, style, size, color, animation }) => {
    const s = size || 24;
    const c = color || "currentColor";
    const st = style || "solid";
    const anim = animation ? ANIMATIONS[animation] : null;

    // Try to fetch real SVG from Font Awesome API
    const apiData = await fetchIconSVG(icon, st);
    let svg;

    if (apiData && apiData.svg) {
      // Use real SVG data from API
      const svgKey = Object.keys(apiData.svg)[0];
      const pathData = apiData.svg[svgKey]?.path;
      const viewBox = apiData.svg[svgKey]?.viewBox || "0 0 512 512";

      if (pathData) {
        const animStyle = anim ? ` style="${anim.css} color: ${c};"` : ` style="color: ${c};"`;
        svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="${viewBox}"${animStyle}>
  <path fill="currentColor" d="${pathData}"/>
</svg>`;
      }
    }

    // Fallback to static database if API fails
    if (!svg) {
      const iconData = ICONS[icon];
      if (!iconData) {
        return {
          content: [{
            type: "text",
            text: `Icon "${icon}" not found. Use search_icons to find available icons.\n\nAPI Token 1: ${FA_TOKENS.primary}\nAPI Token 2: ${FA_TOKENS.secondary}`,
          }],
        };
      }
      const animStyle = anim ? ` style="${anim.css} color: ${c};"` : ` style="color: ${c};"`;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 448 512"${animStyle}>
  <path fill="currentColor" d="M224 0C100.3 0 0 100.3 0 224S100.3 448 224 448 448 347.7 448 224 347.7 0 224 0z"/>
</svg>`;
    }

    return {
      content: [{
        type: "text",
        text: `Icon: fa-${icon} (${st})\nSource: ${apiData ? "Font Awesome API" : "Static database"}\n\nSVG:\n${svg}\n\n${anim ? `Animation: ${anim.name}\n${anim.keyframes}` : "No animation"}`,
      }],
    };
  }
);

// ============================================================
// TOOL: get_animation
// ============================================================
server.tool(
  "get_animation",
  "Get CSS animation preset for icons",
  {
    name: z.string().describe("Animation name (e.g. 'pulse', 'bounce', 'spin', 'glow')"),
  },
  async ({ name }) => {
    const anim = ANIMATIONS[name];
    if (!anim) {
      const available = Object.keys(ANIMATIONS).join(", ");
      return {
        content: [{
          type: "text",
          text: `Animation "${name}" not found.\n\nAvailable: ${available}`,
        }],
      };
    }
    return {
      content: [{
        type: "text",
        text: `Animation: ${anim.name}\nDescription: ${anim.description}\n\nCSS:\n${anim.css}\n\nKeyframes:\n${anim.keyframes}`,
      }],
    };
  }
);

// ============================================================
// TOOL: get_farsi_typing
// ============================================================
server.tool(
  "get_farsi_typing",
  "Get Persian/Farsi typing animation config",
  {
    style: z.string().optional().describe("Typing style: 'standard', 'flicker', 'glow-typing', 'neon', 'cyber'"),
  },
  async ({ style }) => {
    const s = style || "standard";
    const config = FARSI_TYPING[s];
    if (!config) {
      const available = Object.keys(FARSI_TYPING).join(", ");
      return {
        content: [{
          type: "text",
          text: `Style "${s}" not found.\n\nAvailable: ${available}`,
        }],
      };
    }

    const html = `<div class="farsi-typing" style="
  direction: ${config.direction};
  font-family: ${config.fontFamily};
  overflow: hidden;
  white-space: nowrap;
  ${config.cursor}
">
  <span style="animation: ${config.animation} 3.5s steps(40, end) forwards;">
    متن فارسی اینجا قرار می‌گیرد
  </span>
</div>

<style>
${config.keyframes}
@keyframes blink {
  from, to { border-color: transparent; }
  50% { border-color: currentColor; }
}
</style>`;

    return {
      content: [{
        type: "text",
        text: `Farsi Typing: ${config.name}\nDescription: ${config.description}\n\nHTML:\n${html}`,
      }],
    };
  }
);

// ============================================================
// TOOL: generate_hero_icons
// ============================================================
server.tool(
  "generate_hero_icons",
  "Generate a set of animated icons for IRANCOIN hero section",
  {
    theme: z.string().optional().describe("Theme: 'dark', 'light', 'cyber'"),
  },
  async ({ theme }) => {
    const t = theme || "dark";
    const icons = [
      { name: "chart-line", animation: "pulse", color: "#7c3aed" },
      { name: "bolt", animation: "glow", color: "#22d3ee" },
      { name: "shield-halved", animation: "float", color: "#34d399" },
      { name: "brain", animation: "pulse", color: "#a78bfa" },
      { name: "rocket", animation: "float", color: "#ec4899" },
      { name: "signal", animation: "pulse", color: "#22d3ee" },
    ];

    const generated = icons.map(i => {
      const anim = ANIMATIONS[i.animation];
      return {
        icon: i.name,
        animation: i.animation,
        color: i.color,
        html: `<i class="fas fa-${i.name}" style="color: ${i.color}; ${anim.css}"></i>`,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 448 512" style="color: ${i.color}; ${anim.css}">
  <path fill="currentColor" d="M224 0C100.3 0 0 100.3 0 224S100.3 448 224 448 448 347.7 448 224 347.7 0 224 0z"/>
</svg>`,
      };
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          theme: t,
          icons: generated,
          css: Object.values(ANIMATIONS).map(a => `${a.keyframes}`).join("\n\n"),
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: list_animations
// ============================================================
server.tool(
  "list_animations",
  "List all available animation presets",
  {},
  async () => {
    const list = Object.entries(ANIMATIONS).map(([key, anim]) => ({
      name: key,
      title: anim.name,
      description: anim.description,
    }));
    return {
      content: [{
        type: "text",
        text: JSON.stringify(list, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: list_farsi_styles
// ============================================================
server.tool(
  "list_farsi_styles",
  "List all available Persian/Farsi typing styles",
  {},
  async () => {
    const list = Object.entries(FARSI_TYPING).map(([key, config]) => ({
      name: key,
      title: config.name,
      description: config.description,
    }));
    return {
      content: [{
        type: "text",
        text: JSON.stringify(list, null, 2),
      }],
    };
  }
);

// ============================================================
// START SERVER
// ============================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Font Awesome MCP Server for IRANCOIN running");
}

main().catch(console.error);
