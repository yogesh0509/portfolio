/**
 * The single place that lists who I am, what is featured and where it lives.
 * The explorer, the page list, Quick Open, the terminal and the resume
 * are all built from this file plus the generated snapshot in data/.
 *
 * To add a project: add one entry to `projects`. To retire one: delete the entry.
 */

import type { NetworkId } from "../lib/chain/networks";
import { SITE_REPO } from "../lib/site";

/** A read-only function the terminal's `cast call` may run against a deployed contract. */
export interface ContractCall {
  /** `cast` style: name, input types, then return types, e.g. "readMaxPrice()(uint256,uint256)". */
  signature: string;
  summary: string;
}

/** A contract I deployed or recorded, on a testnet. Addresses were checked against the chain. */
export interface DeployedContract {
  name: string;
  network: NetworkId;
  /** EVM addresses must be EIP-55 checksummed: a typo fails the build. */
  address: string;
  /** What it is, and where the address comes from. */
  note?: string;
  calls?: ContractCall[];
}

export interface ExcerptSpec {
  /** owner/name on GitHub. */
  repo: string;
  /** Path of the file inside the repo. */
  path: string;
  /** Full commit SHA the excerpt is pinned to, so the shown code never silently changes. */
  ref: string;
  /** Inclusive 1-based line range. Omit for the whole file (keep it under ~120 lines). */
  lines?: [number, number];
  /** File name shown in the explorer. Defaults to the file's own name. */
  name?: string;
  /**
   * Set when the file has changed upstream but the pinned version is the one to show, with the
   * reason (for example: other contributors reworked it). Silences the sync's "stale excerpt" warning.
   */
  pinnedOnPurpose?: string;
}

export interface Stack {
  languages: string[];
  frameworks: string[];
}

/** One hackathon a project was submitted to. */
export interface HackathonEntry {
  /** The event, and the track when there was one. */
  event: string;
  /** "Winner" or the prize name. Omit when it did not place. */
  result?: string;
  /** The public submission page (Devpost and the like), if one exists. */
  url?: string;
}

export interface FeaturedProject {
  /** Folder name under /projects, /open-source or /hackathons. Lower case, no spaces. */
  slug: string;
  folder: "projects" | "open-source" | "hackathons";
  /** Where it was submitted. Set it for every entry in the "hackathons" folder. */
  hackathons?: HackathonEntry[];
  title: string;
  /** One sentence, used on the welcome page, in `ls` and as the legacy `info` text. */
  tagline: string;
  /**
   * Set to false to leave the project out of the "Featured" list on the welcome README. The project
   * page, explorer entry, Quick Open and terminal still include it. Defaults to true.
   */
  featured?: boolean;
  /** Primary repository, owner/name. Key into the GitHub snapshot. */
  repo: string;
  /** Other repositories whose merged pull requests belong to this entry. */
  extraRepos?: string[];
  period: string;
  role?: string;
  stack: Stack;
  /** Production URL, if one exists. Shown in the PORTS tab. */
  live?: string;
  /** Runs only on a developer machine. Shown in the PORTS tab as local only. */
  local?: { port: number; command: string };
  /** Testnet deployments, listed on the project page and readable with `cast call`. */
  contracts?: DeployedContract[];
  excerpts: ExcerptSpec[];
}

/**
 * A research paper. Its page is content/research/<slug>.md, shown under /research/<slug>/README.md
 * with a facts list built from the fields below.
 */
export interface ResearchEntry {
  slug: string;
  title: string;
  /** One sentence, used on the welcome page, in `ls` and in `man yogesh`. */
  tagline: string;
  /** As printed on the paper, in order. Mine is included. */
  authors: string[];
  /** "2025 to 2026". */
  period: string;
  /** Where the paper stands: which version is out and what comes next. */
  status: string;
  /** Extra lines of the facts list: a label and Markdown for its value (links, dates). */
  facts: { label: string; value: string }[];
  /** Folder of the open-source or project page this paper's code lives in, e.g. "/open-source/djed-solidity". */
  relatedProject?: string;
}

/** A video shown in the editor as a file you can play, and by the terminal's `watch` command. */
export interface VideoSpec {
  /** Folder the video belongs to, e.g. "/hackathons/haystack". It must exist, or the build fails. */
  dir: string;
  /** An https YouTube or Loom address (lib/video.ts reads it; anything else fails the build). */
  url: string;
  title: string;
  /** Length in seconds, from the provider. */
  seconds?: number;
  /** Channel or author when it is not me. */
  by?: string;
  /** File name in the folder. It must end in ".mp4" so the editor treats it as a video. Defaults to "demo.mp4". */
  file?: string;
}

export interface Role {
  title: string;
  /** "YYYY-MM". */
  from: string;
  /** "YYYY-MM", or null for a current role. */
  to: string | null;
}

export interface ExperienceEntry {
  /** File name under /experience, without extension. */
  id: string;
  org: string;
  place: string;
  roles: Role[];
  /** The "Tech stack:" line of the résumé entry, when the résumé Doc has one. */
  stack?: string[];
  bullets: string[];
  /**
   * Keep this entry in the experience list even when the résumé PDF is the source and does not list it as a
   * job (my PDF files Google Summer of Code under "Open source"). It is dropped when the PDF has an entry with
   * the same id, so moving it into the Doc's EXPERIENCE section later does not show it twice.
   */
  keepWithPdf?: boolean;
}

export interface EducationEntry {
  school: string;
  place: string;
  degree: string;
  /** Extra fields from the résumé Doc's degree line, e.g. "CGPA 8.7/10". */
  notes?: string[];
  from: number;
  to: number;
}

/**
 * Links and addresses only. My name, headline (GitHub bio), summary and location come from my GitHub
 * profile through the sync (data/github.json), so the site and GitHub cannot disagree; see lib/profile.ts.
 */
export const profile = {
  handle: "yogesh0509",
  email: "agrawalyogesh5047@gmail.com",
  github: "https://github.com/yogesh0509",
  linkedin: "https://www.linkedin.com/in/yogesh0509",
  /** Public link to a PDF résumé, used only until the sync has read `resumePdf` (below). */
  resumeUrl: "",
} as const;

/**
 * The machine this portfolio is "running on": the WSL2 Ubuntu install I develop in.
 * Shown by the terminal (login message, neofetch, uname) and the status bar.
 * Update these when the system changes; they are copied from /etc/os-release and `uname -r`.
 */
export const system = {
  os: "Ubuntu 24.04.4 LTS",
  /** WSL's $WSL_DISTRO_NAME, shown in the status bar remote indicator. */
  distro: "Ubuntu-24.04",
  kernel: "6.18.33.2-microsoft-standard-WSL2",
  /** `uname -v` */
  kernelVersion: "#1 SMP PREEMPT_DYNAMIC Thu Jun 18 21:54:43 UTC 2026",
  arch: "x86_64",
  user: "yogesh0509",
  /** `apt --version`, so the apt command's banner is the real one. */
  aptVersion: "2.8.3",
  /** The prompt's host name (shortened from the real one for readability). */
  host: "ubuntu",
  /** Contents of /etc/os-release, so `cat /etc/os-release` prints the real file. */
  osRelease: [
    'PRETTY_NAME="Ubuntu 24.04.4 LTS"',
    'NAME="Ubuntu"',
    'VERSION_ID="24.04"',
    'VERSION="24.04.4 LTS (Noble Numbat)"',
    "VERSION_CODENAME=noble",
    "ID=ubuntu",
    "ID_LIKE=debian",
    'HOME_URL="https://www.ubuntu.com/"',
    'SUPPORT_URL="https://help.ubuntu.com/"',
    'BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"',
    'PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"',
    "UBUNTU_CODENAME=noble",
    "LOGO=ubuntu-logo",
  ],
} as const;

/**
 * My résumé is a private Google Doc. I export it as a PDF and keep that PDF in Google Drive, shared
 * as "Anyone with the link: Viewer". The weekly sync downloads the PDF and reads experience,
 * education and skills from it (lib/resume/pdf.ts and parse.ts). `url` is the PDF's Drive share link;
 * the site also links it as "Download the PDF".
 *
 * The three lists below are the fallback. All three are used together while the PDF is not set,
 * cannot be downloaded, or its EXPERIENCE, EDUCATION or SKILLS section does not parse. The sync's
 * summary says which applied.
 */
export const resumePdf = { url: "https://drive.google.com/file/d/1mRttsLo2FdQwuxZXbwEEjKLLH_4uoZ_W/view?usp=sharing" };

export const experience: ExperienceEntry[] = [
  {
    id: "athenahealth",
    org: "athenahealth",
    place: "Bengaluru",
    roles: [
      { title: "Member of Technical Staff", from: "2026-10", to: null },
      { title: "Associate Member of Technical Staff", from: "2025-07", to: "2026-09" },
      { title: "Product Engineering Intern", from: "2025-01", to: "2025-06" },
    ],
    stack: ["Java", "Spring Boot", "Perl", "TypeScript", "React", "Node.js", "AWS", "Docker", "Jenkins", "Terraform"],
    bullets: [
      "Engineered a Java/Spring Boot pipeline that decouples CMS quality reporting from a legacy Perl/Oracle monolith, extracting enrollment and measure results from Snowflake and publishing Kafka change events to scoring services.",
      "Led multi-region DR (us-west-2 failover) for 5+ production services via Terraform; drove SonarQube hardening.",
    ],
  },
  {
    id: "hashstack",
    org: "Hashstack",
    place: "Bengaluru",
    roles: [{ title: "SDE Intern", from: "2024-03", to: "2024-12" }],
    bullets: [
      "Built an internal SDK that streamlined smart contract integration.",
      "Developed the APIs needed and integrated several DeFi concepts.",
      "Managed CI/CD pipelines and GitHub Actions for AWS deployments.",
      "Handled third-party DeFi integrations on Starknet L2 and Ethereum L1.",
      "Developed a backend relayer for cost-effective DeFi investments from Starknet to Layer 1, reducing transaction costs.",
    ],
  },
  {
    id: "gsoc-aossie",
    org: "Google Summer of Code, with AOSSIE and the Djed Alliance",
    place: "Remote",
    roles: [{ title: "Blockchain Intern", from: "2024-05", to: "2024-09" }],
    keepWithPdf: true,
    bullets: [
      "Developed, tested and deployed an oracle adapter for Djed, a crypto-backed algorithmic stablecoin on EVM-based networks.",
      "Worked on Djed Shu: built a converter that adapts one-price oracles to two-price oracles by tracking the maximum and minimum prices over 24 hours.",
    ],
  },
];

/**
 * Experience entries that point to a project page, by experience id. Applied whether the entry comes from
 * the résumé PDF or from this file. The value is the project's folder, e.g. "/open-source/djed-solidity".
 */
export const experienceLinks: Record<string, string> = {
  "gsoc-aossie": "/open-source/djed-solidity",
};

export const education: EducationEntry[] = [
  {
    school: "BMS College of Engineering",
    place: "Bengaluru",
    degree: "Bachelor of Engineering, Information Science and Engineering",
    from: 2021,
    to: 2025,
  },
];

export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["Rust", "Solidity", "Cairo", "TypeScript", "JavaScript", "Python", "C++"] },
  { group: "Blockchain", items: ["Foundry", "Hardhat", "Chainlink", "Starknet", "Bitcoin Dev Kit", "Electrum protocol"] },
  { group: "Backend and infrastructure", items: ["Node.js", "PostgreSQL", "Prisma", "Docker", "AWS", "GitHub Actions"] },
];

/** Listed in this order in the explorer: open source first, then my own projects, then hackathons. */
export const projects: FeaturedProject[] = [
  {
    slug: "djed-solidity",
    folder: "open-source",
    title: "Djed stablecoin protocol",
    tagline:
      "Oracle adapters, deployment scripts and the Shu oracle converter for Djed, a crypto-backed stablecoin protocol.",
    repo: "DjedAlliance/Djed-Solidity",
    extraRepos: ["DjedAlliance/Djed-Solidity-WebDashboard"],
    period: "2023 to 2026",
    role: "GSoC'24 Blockchain Intern, then contributor",
    stack: { languages: ["Solidity", "JavaScript"], frameworks: ["Foundry", "Chainlink", "API3"] },
    contracts: [
      {
        name: "Chainlink inverting oracle",
        network: "sepolia",
        address: "0xB9C050Fd340aD5ED3093F31aAFAcC3D779f405f4",
        note: "The Sepolia oracle address I recorded in the deployment parameters (#25). It reports the ETH price inverted.",
        calls: [
          { signature: "scalingFactor()(uint256)", summary: "the factor the price is scaled by" },
          { signature: "readData()(uint256)", summary: "the current inverted price" },
        ],
      },
      {
        name: "ShuOracleConverter",
        network: "mordor",
        address: "0x8Bd4A5F6a4727Aa4AC05f8784aACAbE2617e860A",
        note: "The Shu converter address I recorded in the deployment parameters (#27). It was last updated in September 2024, before the 2026 fix.",
        calls: [
          { signature: "UPDATE_TIME_IN_HOUR()(uint8)", summary: "the number of hourly buckets" },
          { signature: "lastTimestamp()(uint256)", summary: "when the window last moved (a Unix time)" },
          { signature: "readMaxPrice()(uint256,uint256)", summary: "the highest hourly average and the block time" },
          { signature: "readMinPrice()(uint256,uint256)", summary: "the lowest hourly average and the block time" },
        ],
      },
    ],
    excerpts: [
      {
        // The Shu oracle converter: a 24-hour rolling window of hourly price buckets, from which the
        // maximum and minimum price are read. This is the version after the rolling-window fix (#57).
        repo: "DjedAlliance/Djed-Solidity",
        path: "src/ShuOracleConverter.sol",
        ref: "68bb89ec832c1d587cb68b716e7d42398ef4b54b",
        lines: [47, 126],
      },
      {
        repo: "DjedAlliance/Djed-Solidity",
        path: "src/test/ShuOracleConverter.t.sol",
        ref: "68bb89ec832c1d587cb68b716e7d42398ef4b54b",
        lines: [10, 95],
      },
    ],
  },
  {
    slug: "zeroxbridge",
    folder: "open-source",
    featured: false,
    title: "ZeroXBridge",
    tagline:
      "Deployment tooling for the L1 (Solidity) and L2 (Cairo) contracts, MMR index fixes in the Cairo bridge contract, and a Starknet burn-event fetcher in the Rust sequencer.",
    repo: "Explore-Beyond-Innovations/ZeroXBridge_Contracts",
    extraRepos: ["Explore-Beyond-Innovations/ZeroXBridge_Sequencer"],
    period: "2025",
    role: "Contributor",
    stack: { languages: ["TypeScript", "Cairo", "Rust"], frameworks: ["Starknet", "Foundry"] },
    contracts: [
      {
        name: "ZeroXBridgeL1",
        network: "sepolia",
        address: "0x3f39E6318C1657363b61Ab4db74FE6e904B1A60D",
        note: "From my L1 deployment run, June 2025.",
        calls: [
          { signature: "owner()(address)", summary: "the owner" },
          { signature: "proofRegistry()(address)", summary: "the proof registry it uses" },
          { signature: "tvl()(uint256)", summary: "the total value locked" },
        ],
      },
      { name: "ProofRegistry", network: "sepolia", address: "0x276352e7bFF59CE5455A8F33378060dCf3F56b15", note: "From my L1 deployment run." },
      {
        name: "MerkleManager",
        network: "sepolia",
        address: "0x923aac3feA9e32F7823d09b138120B2eDcd92BAF",
        note: "From my L1 deployment run.",
        calls: [
          { signature: "getRootHash()(bytes32)", summary: "the current Merkle root" },
          { signature: "getElementsCount()(uint256)", summary: "the number of elements added" },
        ],
      },
      {
        name: "MerkleStateManager",
        network: "sepolia",
        address: "0xA04fb80117543b3BE99479Bd57D2a8983594Cef2",
        note: "From my L1 deployment run. Its source was later removed from the main branch.",
        calls: [
          { signature: "depositRoot()(bytes32)", summary: "the deposit root" },
          { signature: "withdrawalRoot()(bytes32)", summary: "the withdrawal root" },
        ],
      },
      { name: "ProofRegistry (L2)", network: "starknet-sepolia", address: "0x2d55767c6dadedb374237d1080f864c7883d98ed39005441bba2bf1dab30c65", note: "From my L2 deployment run, June 2025." },
      { name: "L2Oracle", network: "starknet-sepolia", address: "0x552753fccbc71a1d0e7d0295a436fed27535b178c8da4f434f8186ce7df5c39", note: "From my L2 deployment run." },
      { name: "xZBERC20", network: "starknet-sepolia", address: "0x4a011be1a7eb09902ba495b2bfb46e82e1013a00bd8bb47a0c05856c5aab602", note: "From my L2 deployment run." },
      { name: "ZeroXBridgeL2", network: "starknet-sepolia", address: "0x63ec02e40fc049b762a6a71f28fd99e744746743c44fc864a763b0398eea127", note: "From my L2 deployment run." },
    ],
    excerpts: [
      {
        // Deploys the L1 contracts through `forge script`, in dependency order, resuming from saved state.
        repo: "Explore-Beyond-Innovations/ZeroXBridge_Contracts",
        path: "contracts/L1/scripts/deploy_l1.ts",
        ref: "287154d3607028cfd14469f5af4bdbdddf3435dc",
        lines: [198, 293],
      },
      {
        // Declares and deploys the Cairo contracts with starknet.js; safe to re-run.
        repo: "Explore-Beyond-Innovations/ZeroXBridge_Contracts",
        path: "contracts/L2/scripts/deploy_l2.ts",
        ref: "0e617d0b1cf9b0fe83fe36f1d2227eb4d11f52c3",
        lines: [261, 354],
        pinnedOnPurpose: "later commits by other contributors reworked this file; the pinned version is the one I wrote",
      },
      {
        // Fetches burn events from Starknet with a block cursor kept in Postgres.
        repo: "Explore-Beyond-Innovations/ZeroXBridge_Sequencer",
        path: "src/events/l2_event_watcher.rs",
        ref: "cd60f9dd634f0e0768f3181544f906e4996ea344",
        lines: [40, 153],
        pinnedOnPurpose: "later commits by other contributors reworked this file; the pinned version is the one I wrote",
      },
    ],
  },
  {
    slug: "zkvm-benchmarks",
    folder: "open-source",
    featured: false,
    title: "zkVM benchmarks",
    tagline: "Added the RISC Zero programs (Fibonacci, SHA-256, Poseidon hash) to babybear-labs' benchmark of zkVMs and proving schemes.",
    repo: "babybear-labs/benchmark",
    period: "2024",
    role: "Contributor",
    stack: { languages: ["Rust"], frameworks: ["RISC Zero"] },
    excerpts: [
      {
        // A no_std guest program: it runs inside the zkVM and hashes with Poseidon.
        repo: "babybear-labs/benchmark",
        path: "risc-zero/methods/poseidon/src/main.rs",
        ref: "992bbf786b96594ea82ac99b8eac5b2b8aa34284",
        lines: [1, 29],
        name: "poseidon_guest.rs",
      },
    ],
  },
  {
    slug: "trustless-work",
    folder: "open-source",
    featured: false,
    title: "Trustless Work",
    tagline:
      "A spike for Trustless Work, an escrow platform on Stellar: an elizaOS plugin that signs a Stellar transaction pasted into a chat.",
    repo: "Trustless-Work/trustlesswork-spikes",
    period: "February to March 2025",
    role: "Contributor",
    stack: { languages: ["TypeScript"], frameworks: ["elizaOS", "Stellar SDK"] },
    excerpts: [
      {
        // The signing method: reads the secret key through the settings check, picks the network
        // passphrase, decodes the XDR string, signs it and encodes it again.
        repo: "Trustless-Work/trustlesswork-spikes",
        path: "eliza-plugin-stellar/src/plugins/plugin-stellar/actions/index.ts",
        ref: "1a0f7821ee0c0cf4227e35df3df83a09435fac2b",
        lines: [53, 88],
        name: "signTransaction.ts",
      },
    ],
  },
  {
    slug: "jarvis",
    folder: "projects",
    featured: false,
    title: "Jarvis",
    tagline:
      "An offline voice assistant for Windows: a wake word or push-to-talk starts a command, and a local embedding matcher, or a grammar-constrained local LLM when the matcher is unsure, picks one of 25 allowlisted desktop actions.",
    repo: "yogesh0509/jarvis",
    period: "2026",
    stack: {
      languages: ["Python", "PowerShell"],
      frameworks: ["faster-whisper", "openWakeWord", "llama-cpp-python", "Piper TTS", "WebRTC AEC3"],
    },
    excerpts: [
      {
        // Every action, app and direction the local LLM returns is re-checked against the real lists,
        // and each action must carry its own parameter; the grammar is never the only check.
        repo: "yogesh0509/jarvis",
        path: "llm_intent.py",
        ref: "604eebd0816b456b5e47700e17dcbc49d58b7aec",
        lines: [291, 339],
      },
    ],
  },
  {
    slug: "starknet-eth-relayer",
    folder: "projects",
    title: "Starknet to Ethereum relayer",
    tagline:
      "Backend relayer for a startup's cross-chain yield product: batches Starknet vault deposits, bridges them to Ethereum with StarkGate and supplies them to Aave and Compound.",

    repo: "yogesh0509/starknet-eth-backend-relayer",
    period: "2026",
    stack: { languages: ["TypeScript"], frameworks: ["Apibara", "Prisma", "PostgreSQL", "Docker"] },
    // No excerpt on purpose: the repo is one squashed commit and its metadata names another
    // team (APY), so authorship of any single file cannot be verified. Add one once confirmed.
    excerpts: [],
  },
  {
    slug: "web3-dream11",
    folder: "projects",
    title: "web3-DREAM11",
    tagline:
      "Fantasy-cricket marketplace on Base Sepolia: teams bid for players in on-chain auctions, Chainlink Automation runs the auction clock and Chainlink Functions fetches the rankings.",
    repo: "yogesh0509/web3-DREAM11",
    period: "2023 to 2025",
    stack: { languages: ["Solidity", "JavaScript"], frameworks: ["Foundry", "Chainlink Automation", "Chainlink Functions", "Next.js"] },
    live: "https://web3-dream-11.vercel.app",
    contracts: [
      {
        name: "GameFactory",
        network: "base-sepolia",
        address: "0x2058009604a00150BcCCD498845CCDd4d8B09524",
        note: "The factory the live demo reads. It deploys one Game per contest.",
        calls: [
          { signature: "owner()(address)", summary: "who can create games" },
          { signature: "getAllGames()(address[])", summary: "every game it created" },
        ],
      },
      {
        name: "Game",
        network: "base-sepolia",
        address: "0xC7BAF3624D1fCF973863B1Cee1816AC5d89ed4Aa",
        note: "One contest, created by the factory.",
        calls: [
          { signature: "REGISTRATION_FEE()(uint256)", summary: "the fee to register, in wei" },
          { signature: "s_auctionTime()(uint256)", summary: "seconds between Automation calls" },
          { signature: "s_totalplayerCount()(uint256)", summary: "players in the game" },
          { signature: "s_subscriptionId()(uint64)", summary: "the Chainlink Functions subscription" },
          { signature: "donId()(bytes32)", summary: "the Functions network it uses, as text in hex" },
          { signature: "s_auctionState()(bool)", summary: "whether an auction is open" },
          { signature: "getBuyers()(address[])", summary: "the registered teams" },
        ],
      },
    ],
    excerpts: [
      {
        // Automation upkeep, the Functions request and its callback. Pinned to the last commit that
        // compiles; it matches the contract deployed on Base Sepolia.
        repo: "yogesh0509/web3-DREAM11",
        path: "core/src/Game.sol",
        ref: "ce191a07ffaa083705ae1eb483bc7664e0bed190",
        lines: [181, 283],
        pinnedOnPurpose: "main no longer compiles; this commit is the one that matches the deployed contract",
      },
      {
        // The per-game bid ledger.
        repo: "yogesh0509/web3-DREAM11",
        path: "core/src/Auction.sol",
        ref: "ce191a07ffaa083705ae1eb483bc7664e0bed190",
        lines: [6, 73],
      },
    ],
  },
  {
    slug: "crosschain-hub",
    folder: "projects",
    title: "CrossChain-Hub",
    tagline:
      "A relay for calling a function on another chain over Chainlink CCIP: an API builds the payload, a sender contract pays the fee, a receiver contract makes the call.",
    repo: "yogesh0509/CrossChain-Hub",
    period: "2023 to 2024",
    stack: { languages: ["Solidity", "TypeScript"], frameworks: ["Chainlink CCIP", "Foundry", "Express"] },
    contracts: [
      { name: "CrossHubSender", network: "sepolia", address: "0x90F221148797B9344550C68f13F2A6dCA377133e", calls: [{ signature: "owner()(address)", summary: "the owner" }] },
      { name: "CrossHubReceiver", network: "sepolia", address: "0xdBe8618D149CfAF4569024968BF721550748A292", note: "An earlier version than the code in the repository.", calls: [{ signature: "getRouter()(address)", summary: "the CCIP router it trusts" }] },
      { name: "CrossHubSender", network: "fuji", address: "0x1F09D7d259073414a81E5663C74a76182B05852D", calls: [{ signature: "owner()(address)", summary: "the owner" }] },
      {
        name: "CrossHubReceiver",
        network: "fuji",
        address: "0x7FD625ba0a3b5E05d1a8E0FE697eA24E0feca20C",
        calls: [
          { signature: "getRouter()(address)", summary: "the CCIP router it trusts" },
          { signature: "s_feeToken()(address)", summary: "the token it pays fees in" },
        ],
      },
      { name: "Voter (demo)", network: "fuji", address: "0x7AD8970f27D3B9C204Cd555696a30cA3C69249AD", note: "The contract the demo app calls across chains." },
    ],
    excerpts: [
      {
        // Adapted from Chainlink's CCIP starter kit (BasicMessageSender): raw bytes payload,
        // balance pre-check, per-call approval. The README says so.
        repo: "yogesh0509/CrossChain-Hub",
        path: "contracts/src/cross-chain-hub/CrossHubSender.sol",
        ref: "c0093fd40737f86db15eed219d000cce4b44e9e2",
        lines: [9, 80],
      },
      {
        // Turns a function ABI and its arguments into the cross-chain payload.
        repo: "yogesh0509/CrossChain-Hub",
        path: "api/app.ts",
        ref: "c0093fd40737f86db15eed219d000cce4b44e9e2",
        lines: [1, 55],
      },
    ],
  },
  {
    slug: "takeyourquiz",
    folder: "projects",
    title: "TakeYourQuiz",
    tagline:
      "A self-testing quiz site: upload a PDF of multiple-choice questions, enter the answer key, then answer A to D against a per-question timer beside an embedded PDF viewer.",
    repo: "yogesh0509/TakeYourQuiz",
    period: "2022",
    stack: { languages: ["JavaScript", "Pug"], frameworks: ["Express", "MongoDB (Mongoose)", "AWS S3", "Adobe PDF Embed API"] },
    live: "https://takeyourquiz.onrender.com",
    // No excerpt on purpose: the candidate functions depend on page-level globals and carry
    // known bugs (see the Status section of the page).
    excerpts: [],
  },
  {
    slug: "portfolio",
    folder: "projects",
    featured: false,
    title: "Portfolio site",
    tagline:
      "This site: a static Next.js page laid out like VS Code, with an explorer, Quick Open and a terminal, all built from one config file and a weekly snapshot of my GitHub data.",
    repo: SITE_REPO,
    period: "2024 to 2026",
    stack: {
      languages: ["TypeScript"],
      frameworks: ["Next.js", "React", "Tailwind CSS", "Shiki", "pdf.js", "GitHub Actions"],
    },
    excerpts: [
      {
        // Reads the site's summary from my GitHub profile README: the text between two HTML comments,
        // reduced to plain words, and kept between 20 and 400 characters.
        repo: SITE_REPO,
        path: "lib/github/summary.ts",
        ref: "60d58d8052f4942370de0b798694118ced20fd5e",
        lines: [1, 39],
      },
    ],
  },
  {
    slug: "haystack",
    folder: "hackathons",
    title: "Haystack",
    tagline:
      "Private Electrum sync for Bitcoin light wallets: each real address hides among decoys, and an attacker module scores the privacy in bits.",
    repo: "yogesh0509/Haystack",
    period: "2026",
    hackathons: [{ event: "BOSS Battle, Cypherpunk track (Private Electrum Sync problem statement)", result: "Winner" }],
    stack: { languages: ["Rust", "Python"], frameworks: ["bdk_electrum", "Docker"] },
    local: { port: 7878, command: "docker run -it --rm -p 127.0.0.1:7878:7878 -v haystack-out:/haystack/out haystack" },
    excerpts: [
      {
        // Keyed decoy derivation: same-type decoys from an HMAC, so every sync sends the same ones.
        repo: "yogesh0509/Haystack",
        path: "haystack-electrum/src/decoy.rs",
        ref: "c745fe6457b4bc42bb8004f76d5ee0c2576d693a",
        lines: [1, 77],
      },
      {
        // The attacker's score: how many of its top guesses are real, in bits.
        repo: "yogesh0509/Haystack",
        path: "attack/scoring.py",
        ref: "c745fe6457b4bc42bb8004f76d5ee0c2576d693a",
        lines: [73, 137],
      },
    ],
  },
  {
    slug: "owl-finance",
    folder: "hackathons",
    title: "Owl Finance",
    tagline:
      "Undercollateralized lending on Solana: a Rust service scores a borrower from zkTLS-verified Binance account data and records the score in an Anchor program.",
    repo: "Lumaen-Labs/leverage-scoring",
    period: "October 2025",
    role: "Scoring service, credit-score instruction and protocol docs, in team Lumaen Labs",
    hackathons: [{ event: "Colosseum Cypherpunk (Solana)" }],
    stack: { languages: ["Rust"], frameworks: ["Axum", "Anchor", "Opacity zkTLS"] },
    excerpts: [
      {
        // Writes the computed score to the credit-score PDA through the program's IDL bindings.
        repo: "Lumaen-Labs/leverage-scoring",
        path: "src/solana_client/mod.rs",
        ref: "0fad04f5f7b8987b04c7a8e77946bf55fa5f1c42",
        lines: [47, 108],
        name: "solana_client.rs",
        pinnedOnPurpose: "the file is on the zktls branch; main is the earlier version without it",
      },
    ],
  },
  {
    slug: "shikamaru-protocol",
    folder: "hackathons",
    title: "Shikamaru Protocol",
    tagline:
      "Eliza AI agents, one per risk level, that split a Starknet portfolio between zkLend lending and Ekubo liquidity pools and send the transactions themselves.",
    repo: "yogesh0509/Shikamaru-Protocol",
    period: "January to February 2025",
    hackathons: [{ event: "Starknet AI Agent Hackathon", result: "Winner" }],
    stack: { languages: ["TypeScript"], frameworks: ["elizaOS", "starknet.js", "zkLend", "Ekubo"] },
    excerpts: [
      {
        // Splits the amount between protocols within the risk tier's bounds, then between the top pools.
        repo: "yogesh0509/Shikamaru-Protocol",
        path: "src/providers/investmentStrategy.ts",
        ref: "22a42f2eb5d0f6e5a861bb25e9c305db9c438ba0",
        lines: [232, 344],
      },
    ],
  },
  {
    slug: "racoto",
    folder: "hackathons",
    title: "RaCoTo",
    tagline:
      "Rainforest Proof-of-Conservation Token: rewards forest owners with tokens for CO2 their forest absorbs, estimated from satellite data that Chainlink Functions brings on-chain.",
    repo: "Rainforest-Conservation-Tokens/RaCoTo",
    period: "2023",
    role: "Smart contracts and Chainlink Functions, in a team of five",
    hackathons: [
      { event: "Chainlink Spring 2023 Hackathon", url: "https://devpost.com/software/raico-rainforest-proof-of-conservation" },
      { event: "Constellation: A Chainlink Hackathon (2023)", url: "https://devpost.com/software/racoto-rainforest-conservation-incentivized-tokens" },
    ],
    stack: { languages: ["Solidity", "JavaScript"], frameworks: ["Chainlink Functions", "Hardhat", "Polygon Mumbai"] },
    // No excerpt on purpose: my commits are in the private RaCoTo-Backend repo, and the public copy
    // of RaCoTo.sol interleaves a teammate's lines with mine.
    excerpts: [],
  },
];

/**
 * My research papers, in the order they are listed. The page body is content/research/<slug>.md.
 * When the final version of Djed Shu is published, add its link to `facts` and update `status`.
 */
export const research: ResearchEntry[] = [
  {
    slug: "djed-shu",
    title: "Djed Shu: A Stablecoin Protocol with Two Oracle Prices",
    tagline:
      "A stablecoin protocol that prices each trade with one of two oracle prices, such as the day's lowest and highest, so that a late or manipulated price does less harm to its reserve.",
    authors: ["Zahnentferner", "Yogesh Agrawal"],
    period: "2025 to 2026",
    status: "Version 1 is public. The final version will follow.",
    facts: [
      // Pinned to a commit of the papers repository, so the link cannot change under the page.
      { label: "Paper", value: "[version 1 (PDF)](https://cdn.jsdelivr.net/gh/StabilityNexus/Papers@8762ee9/papers/Djed/Shu/v1.pdf), listed on [stability.nexus/research](https://stability.nexus/research)" },
      { label: "Presented at", value: "[First Stability Workshop (STABILITY 2025)](https://workshop.stability.nexus/), 15 December 2025, LNM Institute of Information Technology, India" },
    ],
    relatedProject: "/open-source/djed-solidity",
  },
];

/**
 * Videos of my talks and demos. Each becomes a `.mp4` file in its folder that plays in the editor (the player
 * loads from YouTube or Loom only after you press play), and `watch <folder name>` opens it from the terminal.
 * Lengths come from the providers: Loom's oEmbed data, and the YouTube watch page.
 */
export const videos: VideoSpec[] = [
  {
    dir: "/research/djed-shu",
    url: "https://youtu.be/VKPsaCQO_j4",
    title: "Djed Shu Stablecoin Protocol",
    seconds: 2103,
    by: "Stability Nexus",
    file: "talk.mp4",
  },
  {
    dir: "/open-source/djed-solidity",
    url: "https://youtu.be/8oE1aKTmzP4",
    title: "Djed Shu Demo (Ethereum Classic Hackathon)",
    seconds: 82,
    by: "Stability Nexus",
  },
  {
    dir: "/hackathons/haystack",
    url: "https://www.loom.com/share/5c3719e5ebd44815b146ae9ff35d468d",
    title: "Haystack, Hiding Wallet Addresses with Decoys",
    seconds: 301,
  },
  {
    dir: "/hackathons/owl-finance",
    url: "https://www.loom.com/share/f58a19a31d2e40e98ead3427c6c9e55b",
    title: "Owl Finance",
    seconds: 300,
  },
  {
    dir: "/hackathons/shikamaru-protocol",
    url: "https://www.loom.com/share/3ab3322cc3294a2080f5f219e112d2de",
    title: "Bridging Finance with Shikamaru Protocol",
    seconds: 155,
  },
  {
    dir: "/archive/bakexp",
    url: "https://www.loom.com/share/0331606d906541219dfa1ade5e8d591a",
    title: "Introducing Bake XP: A Gamified Social App for Baking Enthusiasts",
    seconds: 279,
  },
];

/** Repos that never appear in the generated /archive folder. Compared case-insensitively. */
export const excludedRepos: string[] = [
  "yogesh0509", // profile README
  "tech-lightlink-engineering-yogesh", // a hiring take-home exercise
  "durgapur-infra", // a client's website, unrelated to the rest
  "BlockDawgs", // template README only
  "face-auth-io", // template README only
  "song-recommendation-kmeans", // no README
  "E-commerce-edu", // coursework
  "medical-consultancy", // coursework
  "local-chainlink-node", // a sample setup script, not a project
  "GSOC2023-Proposal", // a proposal document, not code; the 2024 GSoC work is under experience
];
