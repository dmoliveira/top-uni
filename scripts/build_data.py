#!/usr/bin/env python3
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from html import escape
from difflib import SequenceMatcher
from datetime import datetime, timezone
from pathlib import Path


THE_URL = "https://www.timeshighereducation.com/world-university-rankings/2026/subject-ranking/computer-science"
CACHE_PATH = Path("docs/data/geocode_cache.json")
SITE_URL = "https://dmoliveira.github.io/top-uni"

COUNTRY_INTROS = {
    "United States": "The United States has the deepest concentration of globally recognized computer science and AI research universities, spanning theory, systems, robotics, and frontier machine learning.",
    "United Kingdom": "The United Kingdom combines historic universities with globally influential computer science research, especially in theory, systems, machine learning, and interdisciplinary AI work.",
    "China": "China features a large and highly competitive set of universities with strong momentum in AI, systems, applied computing, and large-scale research engineering.",
    "Australia": "Australia offers a strong group of research universities with visible strengths in machine learning, software engineering, data science, and applied computing across major cities.",
    "Canada": "Canada remains one of the most influential countries in modern AI, with major universities that contribute strongly to deep learning, reinforcement learning, and data-intensive computing.",
    "Singapore": "Singapore has a compact but exceptionally strong university ecosystem for AI, security, systems, and data science, with high international visibility.",
    "Germany": "Germany combines technical universities and major research institutions with strong performance in systems, engineering-driven computing, AI, and applied data research.",
}


REGION_MAP = {
    "United States": "North America",
    "Canada": "North America",
    "Mexico": "North America",
    "United Kingdom": "Europe",
    "Ireland": "Europe",
    "Germany": "Europe",
    "France": "Europe",
    "Netherlands": "Europe",
    "Switzerland": "Europe",
    "Belgium": "Europe",
    "Italy": "Europe",
    "Spain": "Europe",
    "Portugal": "Europe",
    "Denmark": "Europe",
    "Sweden": "Europe",
    "Norway": "Europe",
    "Finland": "Europe",
    "Austria": "Europe",
    "Poland": "Europe",
    "Czech Republic": "Europe",
    "Estonia": "Europe",
    "Hungary": "Europe",
    "Luxembourg": "Europe",
    "China": "Asia",
    "Hong Kong": "Asia",
    "Macau": "Asia",
    "Japan": "Asia",
    "South Korea": "Asia",
    "Singapore": "Asia",
    "Taiwan": "Asia",
    "India": "Asia",
    "Israel": "Asia",
    "Saudi Arabia": "Asia",
    "United Arab Emirates": "Asia",
    "Qatar": "Asia",
    "Turkey": "Asia",
    "Malaysia": "Asia",
    "Thailand": "Asia",
    "Indonesia": "Asia",
    "Australia": "Oceania",
    "New Zealand": "Oceania",
    "Macao": "Asia",
    "Russian Federation": "Europe",
    "Russia": "Europe",
    "Lebanon": "Asia",
    "Brazil": "Latin America",
    "Chile": "Latin America",
    "Argentina": "Latin America",
    "Colombia": "Latin America",
    "South Africa": "Africa",
    "Egypt": "Africa",
}


SPOTLIGHTS = {
    "university-of-oxford": {
        "department": {
            "label": "Department of Computer Science",
            "url": "https://www.cs.ox.ac.uk/",
        },
        "labs": [
            {
                "label": "Visual Geometry Group",
                "url": "https://www.robots.ox.ac.uk/~vgg/",
            },
            {"label": "Oxford Robotics Institute", "url": "https://ori.ox.ac.uk/"},
            {
                "label": "Oxford Applied and Theoretical Machine Learning",
                "url": "https://oatml.cs.ox.ac.uk/",
            },
        ],
        "strengths": ["AI/ML", "computer vision", "robotics", "theory"],
        "advances": [
            "Home to globally influential work in computer vision, robotics, and trustworthy ML.",
            "Strong ecosystem connecting computer science, medicine, and public-interest AI.",
        ],
        "research_links": [
            {"label": "Research overview", "url": "https://www.cs.ox.ac.uk/research/"},
            {
                "label": "Oxford ML portal",
                "url": "https://www.cs.ox.ac.uk/people/academic/index.html#MachineLearning",
            },
        ],
        "papers": [
            {
                "title": "VGGNet / Very Deep Convolutional Networks",
                "url": "https://www.robots.ox.ac.uk/~vgg/publications/2015/Simonyan15/",
            },
            {
                "title": "Spatial Transformer Networks (Oxford co-authors)",
                "url": "https://arxiv.org/abs/1506.02025",
            },
        ],
    },
    "stanford-university": {
        "department": {
            "label": "Stanford Computer Science",
            "url": "https://cs.stanford.edu/",
        },
        "labs": [
            {"label": "SAIL", "url": "https://ai.stanford.edu/"},
            {"label": "Stanford HAI", "url": "https://hai.stanford.edu/"},
            {"label": "Stanford DAWN", "url": "https://dawn.cs.stanford.edu/"},
        ],
        "strengths": ["AI/ML", "systems", "HCI", "robotics"],
        "advances": [
            "Foundational influence across modern AI, large-scale systems, and human-centered computing.",
            "A recurring launch point for open-source frameworks, startups, and frontier-model research.",
        ],
        "research_links": [
            {"label": "Research areas", "url": "https://cs.stanford.edu/research"},
            {"label": "HAI research", "url": "https://hai.stanford.edu/research"},
        ],
        "papers": [
            {
                "title": "ImageNet classification with deep CNNs",
                "url": "https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html",
            },
            {
                "title": "LoRA: Low-Rank Adaptation",
                "url": "https://arxiv.org/abs/2106.09685",
            },
        ],
    },
    "massachusetts-institute-of-technology": {
        "department": {"label": "EECS", "url": "https://www.eecs.mit.edu/"},
        "labs": [
            {"label": "CSAIL", "url": "https://www.csail.mit.edu/"},
            {
                "label": "MIT-IBM Watson AI Lab",
                "url": "https://mitibmwatsonailab.mit.edu/",
            },
            {
                "label": "Institute for Data, Systems, and Society",
                "url": "https://idss.mit.edu/",
            },
        ],
        "strengths": ["AI/ML", "robotics", "systems", "data science"],
        "advances": [
            "Flagship research center for AI, robotics, computer vision, and trustworthy computing.",
            "Deep strength in translating core CS advances into science and engineering platforms.",
        ],
        "research_links": [
            {"label": "EECS research", "url": "https://www.eecs.mit.edu/research/"},
            {"label": "CSAIL research", "url": "https://www.csail.mit.edu/research"},
        ],
        "papers": [
            {
                "title": "MapReduce",
                "url": "https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/",
            },
            {
                "title": "RSA cryptosystem",
                "url": "https://people.csail.mit.edu/rivest/Rsapaper.pdf",
            },
        ],
    },
    "carnegie-mellon-university": {
        "department": {
            "label": "School of Computer Science",
            "url": "https://www.cs.cmu.edu/",
        },
        "labs": [
            {"label": "Robotics Institute", "url": "https://www.ri.cmu.edu/"},
            {"label": "Machine Learning Department", "url": "https://www.ml.cmu.edu/"},
            {
                "label": "Language Technologies Institute",
                "url": "https://www.lti.cs.cmu.edu/",
            },
        ],
        "strengths": ["AI/ML", "robotics", "NLP", "autonomous systems"],
        "advances": [
            "One of the deepest university ecosystems for AI, robotics, speech, and autonomous systems.",
            "Repeatedly influential in robotics, self-driving, reinforcement learning, and language tech.",
        ],
        "research_links": [
            {"label": "SCS research", "url": "https://www.cs.cmu.edu/research"},
            {"label": "RI research", "url": "https://www.ri.cmu.edu/research/"},
        ],
        "papers": [
            {
                "title": "POMDPs in robotics and planning",
                "url": "https://www.cs.cmu.edu/~ggordon/780-s07/pomdp.pdf",
            },
            {
                "title": "Self-driving and autonomy publications",
                "url": "https://theairlab.org/publications/",
            },
        ],
    },
    "university-of-california-berkeley": {
        "department": {
            "label": "EECS at Berkeley",
            "url": "https://eecs.berkeley.edu/",
        },
        "labs": [
            {"label": "BAIR", "url": "https://bair.berkeley.edu/"},
            {"label": "Sky Computing Lab", "url": "https://sky.cs.berkeley.edu/"},
            {"label": "AMP Lab (historical)", "url": "https://amplab.cs.berkeley.edu/"},
        ],
        "strengths": ["AI/ML", "systems", "data systems", "theory"],
        "advances": [
            "Home to major advances in distributed systems, data platforms, and modern AI research.",
            "Berkeley labs have shaped Spark, RISC research, open-source ML systems, and safety work.",
        ],
        "research_links": [
            {"label": "EECS research", "url": "https://eecs.berkeley.edu/research/"},
            {"label": "BAIR research", "url": "https://bair.berkeley.edu/research/"},
        ],
        "papers": [
            {
                "title": "Spark: Cluster Computing with Working Sets",
                "url": "https://www.usenix.org/conference/hotcloud10/spark-cluster-computing-working-sets",
            },
            {
                "title": "RISC-V overview",
                "url": "https://riscv.org/technical/specifications/",
            },
        ],
    },
    "eth-zurich": {
        "department": {
            "label": "Department of Computer Science",
            "url": "https://inf.ethz.ch/",
        },
        "labs": [
            {"label": "ETH AI Center", "url": "https://ai.ethz.ch/"},
            {"label": "Robotic Systems Lab", "url": "https://rsl.ethz.ch/"},
            {"label": "SPCL", "url": "https://spcl.inf.ethz.ch/"},
        ],
        "strengths": ["AI/ML", "robotics", "high-performance computing", "systems"],
        "advances": [
            "A leading European center for robotics, AI engineering, numerical computing, and systems research.",
            "Frequently bridges academic depth with strong industrial collaboration and open tooling.",
        ],
        "research_links": [
            {
                "label": "Department research",
                "url": "https://inf.ethz.ch/research.html",
            },
            {"label": "AI Center projects", "url": "https://ai.ethz.ch/research.html"},
        ],
        "papers": [
            {
                "title": "ANYmal and locomotion research",
                "url": "https://rsl.ethz.ch/robots-media/anymal.html",
            },
            {
                "title": "DaCe / data-centric compilation",
                "url": "https://spcl.inf.ethz.ch/Research/DAPP.html",
            },
        ],
    },
    "national-university-of-singapore": {
        "department": {
            "label": "NUS School of Computing",
            "url": "https://www.comp.nus.edu.sg/",
        },
        "labs": [
            {"label": "NUS AI Institute", "url": "https://ai.nus.edu.sg/"},
            {"label": "Institute of Data Science", "url": "https://ids.nus.edu.sg/"},
            {
                "label": "Centre for Trusted Internet and Community",
                "url": "https://ctic.comp.nus.edu.sg/",
            },
        ],
        "strengths": ["AI/ML", "data science", "security", "systems"],
        "advances": [
            "A leading Asia-Pacific hub for AI, analytics, security, and large-scale computing research.",
            "Strong translational portfolio linking foundational CS to public-sector and industry deployment.",
        ],
        "research_links": [
            {
                "label": "NUS research areas",
                "url": "https://www.comp.nus.edu.sg/research/",
            },
            {"label": "IDS programs", "url": "https://ids.nus.edu.sg/research/"},
        ],
        "papers": [
            {
                "title": "Graph neural and representation learning outputs",
                "url": "https://ai.nus.edu.sg/publications/",
            },
            {
                "title": "NUS computing publications",
                "url": "https://www.comp.nus.edu.sg/research/publication/",
            },
        ],
    },
    "tsinghua-university": {
        "department": {
            "label": "Department of Computer Science and Technology",
            "url": "https://www.cs.tsinghua.edu.cn/csen/",
        },
        "labs": [
            {
                "label": "Institute for AI Industry Research (AIR)",
                "url": "https://air.tsinghua.edu.cn/en/",
            },
            {
                "label": "Institute for Interdisciplinary Information Sciences",
                "url": "https://iiis.tsinghua.edu.cn/en/",
            },
        ],
        "strengths": ["AI/ML", "systems", "theory", "applied computing"],
        "advances": [
            "One of the strongest global research engines in AI, large-scale computing, and interdisciplinary information science.",
            "Particularly visible in foundation models, chips, and industry-linked AI deployment.",
        ],
        "research_links": [
            {
                "label": "Research overview",
                "url": "https://www.cs.tsinghua.edu.cn/csen/Research.htm",
            },
            {
                "label": "AIR research",
                "url": "https://air.tsinghua.edu.cn/en/research/research_direction.htm",
            },
        ],
        "papers": [
            {
                "title": "GLM language model papers",
                "url": "https://arxiv.org/abs/2210.02414",
            },
            {
                "title": "Tsinghua AI research news",
                "url": "https://air.tsinghua.edu.cn/en/info/1008/list.htm",
            },
        ],
    },
    "peking-university": {
        "department": {
            "label": "School of Computer Science",
            "url": "https://english.pku.edu.cn/academics/schoolsdepartments/schoolofcomputerscience/index.htm",
        },
        "labs": [
            {
                "label": "Institute for Artificial Intelligence",
                "url": "https://www.ai.pku.edu.cn/en/",
            },
            {
                "label": "Wangxuan Institute of Computer Technology",
                "url": "https://www.ss.pku.edu.cn/en/",
            },
        ],
        "strengths": [
            "AI/ML",
            "theory",
            "language technologies",
            "data-intensive computing",
        ],
        "advances": [
            "A major Chinese research center for AI, language technologies, and computing theory.",
            "Strong presence in national-scale labs, foundational methods, and interdisciplinary AI work.",
        ],
        "research_links": [
            {
                "label": "CS research",
                "url": "https://cs.pku.edu.cn/English/Research.htm",
            },
            {"label": "AI institute", "url": "https://www.ai.pku.edu.cn/en/research/"},
        ],
        "papers": [
            {
                "title": "PKU AI publications",
                "url": "https://www.ai.pku.edu.cn/en/research/publications.htm",
            },
            {
                "title": "Foundational language and multimodal papers",
                "url": "https://arxiv.org/list/cs.AI/recent",
            },
        ],
    },
    "university-of-cambridge": {
        "department": {
            "label": "Computer Laboratory",
            "url": "https://www.cst.cam.ac.uk/",
        },
        "labs": [
            {
                "label": "Cambridge Machine Learning Group",
                "url": "https://mlg.eng.cam.ac.uk/",
            },
            {
                "label": "Systems Research Group",
                "url": "https://www.cst.cam.ac.uk/research/srg",
            },
            {
                "label": "Cambridge Centre for AI in Medicine",
                "url": "https://www.cai.cam.ac.uk/",
            },
        ],
        "strengths": ["systems", "ML", "security", "theory"],
        "advances": [
            "Long-running excellence in systems, networks, security, machine learning, and foundational computing.",
            "Strong ties across computer science, engineering, mathematics, and biomedicine.",
        ],
        "research_links": [
            {"label": "Research groups", "url": "https://www.cst.cam.ac.uk/research"},
            {
                "label": "Machine learning group",
                "url": "https://mlg.eng.cam.ac.uk/research/",
            },
        ],
        "papers": [
            {
                "title": "Cambridge systems and verification publications",
                "url": "https://www.cst.cam.ac.uk/publications",
            },
            {
                "title": "AlphaFold paper (Cambridge-linked alumni/research ecosystem)",
                "url": "https://www.nature.com/articles/s41586-021-03819-2",
            },
        ],
    },
    "ecole-polytechnique-federale-de-lausanne": {
        "department": {
            "label": "School of Computer and Communication Sciences",
            "url": "https://www.epfl.ch/schools/ic/",
        },
        "labs": [
            {
                "label": "EPFL AI Center",
                "url": "https://www.epfl.ch/research/domains/ai-center/",
            },
            {"label": "CVLab", "url": "https://www.epfl.ch/labs/cvlab/"},
            {"label": "DSLAB", "url": "https://www.epfl.ch/labs/dslab/"},
        ],
        "strengths": ["computer vision", "systems", "ML", "robotics"],
        "advances": [
            "High-impact European research center for computer vision, decentralized systems, and machine learning.",
            "Strong mix of theory, applied AI, and open scientific infrastructure.",
        ],
        "research_links": [
            {
                "label": "IC research labs",
                "url": "https://www.epfl.ch/schools/ic/research/",
            },
            {
                "label": "AI Center",
                "url": "https://www.epfl.ch/research/domains/ai-center/research/",
            },
        ],
        "papers": [
            {
                "title": "OpenPose / pose estimation lineage",
                "url": "https://github.com/CMU-Perceptual-Computing-Lab/openpose",
            },
            {
                "title": "EPFL IC publications",
                "url": "https://infoscience.epfl.ch/communities/IC",
            },
        ],
    },
    "university-of-toronto": {
        "department": {
            "label": "Department of Computer Science",
            "url": "https://web.cs.toronto.edu/",
        },
        "labs": [
            {"label": "Vector Institute", "url": "https://vectorinstitute.ai/"},
            {
                "label": "Machine Learning Group",
                "url": "https://www.cs.toronto.edu/~hinton/",
            },
            {
                "label": "UofT Robotics Institute",
                "url": "https://robotics.utoronto.ca/",
            },
        ],
        "strengths": ["deep learning", "AI/ML", "reinforcement learning", "robotics"],
        "advances": [
            "A cornerstone of modern deep learning with enduring strength in neural nets, vision, and RL.",
            "The Toronto ecosystem is especially influential in frontier AI talent development.",
        ],
        "research_links": [
            {"label": "Research areas", "url": "https://web.cs.toronto.edu/research"},
            {"label": "Vector research", "url": "https://vectorinstitute.ai/research/"},
        ],
        "papers": [
            {
                "title": "Dropout",
                "url": "https://jmlr.org/papers/v15/srivastava14a.html",
            },
            {
                "title": "AlexNet",
                "url": "https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html",
            },
        ],
    },
}


OFFICIAL_OVERRIDES = {
    "university-of-oxford": {"official_url": "https://www.ox.ac.uk/"},
    "university-of-cambridge": {"official_url": "https://www.cam.ac.uk/"},
    "eth-zurich": {"official_url": "https://ethz.ch/en.html"},
    "massachusetts-institute-of-technology": {
        "official_url": "https://www.mit.edu/",
        "city": "Cambridge",
        "founded": 1861,
    },
    "princeton-university": {
        "official_url": "https://www.princeton.edu/",
        "city": "Princeton",
        "founded": 1746,
    },
    "stanford-university": {
        "official_url": "https://www.stanford.edu/",
        "city": "Stanford",
        "founded": 1885,
    },
    "carnegie-mellon-university": {
        "official_url": "https://www.cmu.edu/",
        "city": "Pittsburgh",
        "founded": 1900,
    },
    "harvard-university": {
        "official_url": "https://www.harvard.edu/",
        "city": "Cambridge",
        "founded": 1636,
    },
    "imperial-college-london": {
        "official_url": "https://www.imperial.ac.uk",
        "city": "London",
        "founded": 1907,
    },
    "university-of-edinburgh": {
        "official_url": "https://www.ed.ac.uk/",
        "city": "Edinburgh",
        "founded": 1582,
    },
    "ecole-polytechnique-federale-de-lausanne": {
        "official_url": "https://www.epfl.ch/en/"
    },
    "peking-university": {
        "official_url": "https://english.pku.edu.cn",
        "city": "Beijing",
        "founded": 1898,
    },
    "tsinghua-university": {
        "official_url": "https://www.tsinghua.edu.cn/en/",
        "city": "Beijing",
        "founded": 1911,
    },
    "national-university-of-singapore": {
        "official_url": "https://www.nus.edu.sg/",
        "city": "Singapore",
        "founded": 1905,
    },
    "university-of-california-berkeley": {
        "official_url": "https://www.berkeley.edu/",
        "city": "Berkeley",
        "founded": 1868,
    },
    "university-of-toronto": {
        "official_url": "https://www.utoronto.ca/",
        "city": "Toronto",
        "founded": 1827,
    },
    "technical-university-of-munich": {
        "official_url": "https://www.tum.de/en",
        "city": "Munich",
        "founded": 1868,
    },
    "nanyang-technological-university-singapore": {
        "official_url": "https://www.ntu.edu.sg/",
        "city": "Singapore",
        "founded": 1991,
    },
    "zhejiang-university": {
        "official_url": "https://www.zju.edu.cn/english/",
        "city": "Hangzhou",
        "founded": 1897,
    },
    "the-hong-kong-university-of-science-and-technology": {
        "official_url": "https://hkust.edu.hk/",
        "city": "Hong Kong",
        "founded": 1991,
    },
    "georgia-institute-of-technology": {
        "official_url": "https://www.gatech.edu/",
        "city": "Atlanta",
        "founded": 1885,
    },
    "johns-hopkins-university": {
        "official_url": "https://www.jhu.edu/",
        "city": "Baltimore",
        "founded": 1876,
    },
    "the-chinese-university-of-hong-kong": {
        "official_url": "https://www.cuhk.edu.hk/english/",
        "city": "Hong Kong",
        "founded": 1963,
    },
    "delft-university-of-technology": {
        "official_url": "https://www.tudelft.nl/en",
        "city": "Delft",
        "founded": 1842,
    },
    "university-of-hong-kong": {"official_url": "https://www.hku.hk/"},
    "university-of-science-and-technology-of-china": {
        "official_url": "https://en.ustc.edu.cn/"
    },
    "paris-sciences-et-lettres-psl-research-university-paris": {
        "official_url": "https://psl.eu/en",
        "city": "Paris",
    },
    "university-of-texas-at-austin": {
        "official_url": "https://www.utexas.edu/",
        "city": "Austin",
        "founded": 1883,
    },
    "korea-advanced-institute-of-science-and-technology-kaist": {
        "official_url": "https://www.kaist.ac.kr/en/",
        "city": "Daejeon",
        "founded": 1971,
    },
    "nanjing-university": {"official_url": "https://www.nju.edu.cn/EN/"},
    "city-university-of-hong-kong": {"official_url": "https://www.cityu.edu.hk/"},
    "yonsei-university-seoul-campus": {
        "official_url": "https://www.yonsei.ac.kr/en_sc/",
        "city": "Seoul",
    },
    "national-taiwan-university-ntu": {
        "official_url": "https://www.ntu.edu.tw/english/",
        "city": "Taipei",
    },
    "pohang-university-of-science-and-technology-postech": {
        "official_url": "https://www.postech.ac.kr/eng/",
        "city": "Pohang",
    },
    "penn-state-main-campus": {
        "official_url": "https://www.psu.edu/",
        "city": "University Park",
    },
    "southern-university-of-science-and-technology-sustech": {
        "official_url": "https://www.sustech.edu.cn/en/",
        "city": "Shenzhen",
    },
    "university-of-virginia-main-campus": {
        "official_url": "https://www.virginia.edu/",
        "city": "Charlottesville",
    },
    "ohio-state-university-main-campus": {
        "official_url": "https://www.osu.edu/",
        "city": "Columbus",
    },
    "university-of-wurzburg": {
        "official_url": "https://www.uni-wuerzburg.de/en/",
        "city": "Würzburg",
    },
    "queensland-university-of-technology": {
        "official_url": "https://www.qut.edu.au/",
        "city": "Brisbane",
    },
    "the-hong-kong-polytechnic-university": {
        "official_url": "https://www.polyu.edu.hk/"
    },
    "kyoto-university": {"official_url": "https://www.kyoto-u.ac.jp/en"},
    "wuhan-university": {"official_url": "https://en.whu.edu.cn/"},
    "australian-national-university": {
        "official_url": "https://www.anu.edu.au/",
        "city": "Canberra",
        "founded": 1946,
    },
    "monash-university": {"official_url": "https://www.monash.edu/"},
    "university-of-auckland": {"official_url": "https://www.auckland.ac.nz/"},
    "universite-grenoble-alpes": {
        "official_url": "https://www.univ-grenoble-alpes.fr/english/"
    },
    "university-of-birmingham": {"official_url": "https://www.birmingham.ac.uk/"},
    "universiti-teknologi-petronas": {"official_url": "https://www.utp.edu.my/"},
    "macau-university-of-science-and-technology": {
        "official_url": "https://www.must.edu.mo/en/"
    },
    "norwegian-university-of-science-and-technology": {
        "official_url": "https://www.ntnu.edu/"
    },
    "university-college-dublin": {"official_url": "https://www.ucd.ie/"},
    "university-of-oulu": {"official_url": "https://www.oulu.fi/en"},
    "north-carolina-state-university": {"official_url": "https://www.ncsu.edu/"},
    "university-of-notre-dame": {"official_url": "https://www.nd.edu/"},
    "university-of-florida": {"official_url": "https://www.ufl.edu/"},
    "bauman-moscow-state-technical-university": {
        "official_url": "https://bmstu.ru/en/",
        "city": "Moscow",
    },
}


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read().decode("utf-8", "ignore")


def fetch_json(url: str):
    return json.loads(fetch_text(url))


def load_geocode_cache():
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_geocode_cache(cache):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def geocode_query(query: str):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": query, "format": "jsonv2", "limit": 1}
    )
    req = urllib.request.Request(url, headers={"User-Agent": "top-uni-directory/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.loads(response.read().decode("utf-8", "ignore"))


def resolve_coordinates(name: str, city: str, country: str, cache):
    queries = [f"{name}, {country}"]
    if city:
        queries.append(f"{name}, {city}, {country}")
        queries.append(f"{city}, {country}")
    for query in queries:
        if query in cache:
            result = cache[query]
        else:
            result = geocode_query(query)
            cache[query] = result
            save_geocode_cache(cache)
            time.sleep(1)
        if result:
            item = result[0]
            return float(item["lat"]), float(item["lon"])
    return None, None


def slugify(value: str) -> str:
    value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    )
    value = value.lower().replace("&", "and")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def normalize(value: str) -> str:
    value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    )
    value = value.lower()
    for token in ["university", "the", "of", "and", "at", "in", "campus", "college"]:
        value = re.sub(rf"\b{token}\b", " ", value)
    value = value.replace("&", " ")
    value = re.sub(r"[^a-z0-9]+", "", value)
    return value


def name_tokens(value: str):
    tokens = re.findall(r"[a-z0-9]+", value.lower().replace("&", " and "))
    stop = {
        "the",
        "of",
        "and",
        "for",
        "at",
        "in",
        "university",
        "college",
        "campus",
        "school",
    }
    return {token for token in tokens if token not in stop and len(token) > 2}


def region_for(country: str) -> str:
    return REGION_MAP.get(country, "Other")


def acronym(value: str) -> str:
    parts = [
        p
        for p in re.findall(r"[A-Za-z]+", value)
        if p.lower() not in {"the", "of", "and", "for", "at", "in"}
    ]
    return "".join(part[0].lower() for part in parts if part)


def trusted_official(name: str, url: str) -> bool:
    if not url:
        return False
    domain = urllib.parse.urlparse(url).netloc.lower()
    if any(token in domain for token in ["museum", "hospital", "clinic"]):
        return False
    slug = slugify(name)
    if slug in OFFICIAL_OVERRIDES:
        return True
    tokens = sorted(name_tokens(name), key=len, reverse=True)
    domain_clean = re.sub(r"[^a-z0-9]+", "", domain)
    if any(token in domain_clean for token in tokens[:2]):
        return True
    short = acronym(name)
    if len(short) >= 3 and short in domain_clean:
        return True
    if (
        domain.endswith(
            (".edu", ".edu.cn", ".edu.sg", ".ac.uk", ".ac.jp", ".ac.kr", ".edu.hk")
        )
        and len(tokens) > 0
    ):
        return any(token[:4] in domain_clean for token in tokens[:2] if len(token) >= 4)
    return False


def generic_strengths(rank: int):
    if rank <= 25:
        return ["AI/ML", "systems", "data science", "theory"]
    if rank <= 75:
        return [
            "AI/ML",
            "data systems",
            "software/systems",
            "interdisciplinary computing",
        ]
    if rank <= 150:
        return [
            "AI/ML",
            "data-intensive computing",
            "software engineering",
            "applied computing",
        ]
    return [
        "computer science",
        "AI/data",
        "applied research",
        "interdisciplinary computing",
    ]


def load_the_top_200():
    html = fetch_text(THE_URL)
    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html
    )
    if not match:
        raise RuntimeError("Could not locate THE ranking data payload.")
    data = json.loads(match.group(1))
    rows = data["props"]["pageProps"]["page"]["rankingsTableConfig"]["rankingsData"][
        "data"
    ]
    output = []
    for row in rows:
        rank_display = row.get("rank", "")
        if not rank_display:
            continue
        rank_number = len(output) + 1
        if rank_number > 200:
            break
        output.append(
            {
                "rank": rank_number,
                "rank_display": rank_display,
                "name": row["name"],
                "country": row["location"],
                "the_url": urllib.parse.urljoin(
                    "https://www.timeshighereducation.com", row["url"]
                ),
                "overall_score": row.get("scores_overall"),
                "research_score": row.get("scores_research"),
                "teaching_score": row.get("scores_teaching"),
                "citations_score": row.get("scores_citations"),
                "industry_score": row.get("scores_industry_income"),
                "international_score": row.get("scores_international_outlook"),
            }
        )
    return output


def ror_query(name: str):
    url = "https://api.ror.org/organizations?query=" + urllib.parse.quote(name)
    return fetch_json(url).get("items", [])


def choose_ror_match(name: str, country: str, items):
    n_name = normalize(name)
    n_tokens = name_tokens(name)
    best = None
    best_score = -1
    for item in items:
        names = [entry["value"] for entry in item.get("names", [])]
        item_country = (
            item.get("locations", [{}])[0]
            .get("geonames_details", {})
            .get("country_name")
        )
        score = 0
        for candidate in names:
            norm = normalize(candidate)
            c_tokens = name_tokens(candidate)
            overlap = len(n_tokens & c_tokens) / max(
                len(n_tokens or {"x"}), len(c_tokens or {"x"})
            )
            score += int(overlap * 50)
            if norm == n_name:
                score += 100
            elif n_name in norm or norm in n_name:
                score += 70
            else:
                score += int(SequenceMatcher(None, n_name, norm).ratio() * 40)
        if item_country == country:
            score += 20
        elif item_country:
            score -= 20
        if "education" in item.get("types", []):
            score += 10
        else:
            score -= 40
        for link in item.get("links", []):
            if link.get("type") != "website":
                continue
            domain = urllib.parse.urlparse(link.get("value", "")).netloc.lower()
            if any(token in domain for token in ["edu", "ac.", "uni", "univ"]):
                score += 8
            if any(token in domain for token in ["museum", "hospital"]):
                score -= 30
        if score > best_score:
            best = item
            best_score = score
    return best if best_score >= 45 else None


def canonical_name_score(name: str, item) -> int:
    n_name = normalize(name)
    n_tokens = name_tokens(name)
    best = 0
    for entry in item.get("names", []):
        candidate = entry.get("value", "")
        norm = normalize(candidate)
        c_tokens = name_tokens(candidate)
        overlap = len(n_tokens & c_tokens) / max(
            len(n_tokens or {"x"}), len(c_tokens or {"x"})
        )
        score = int(overlap * 100)
        if norm == n_name:
            score = max(score, 100)
        elif n_name in norm or norm in n_name:
            score = max(score, 82)
        else:
            score = max(score, int(SequenceMatcher(None, n_name, norm).ratio() * 60))
        best = max(best, score)
    return best


def build_record(row, cache):
    items = ror_query(row["name"])
    match = choose_ror_match(row["name"], row["country"], items)
    website = None
    wikipedia = None
    founded = None
    city = None
    latitude = None
    longitude = None
    ror_id = None
    related = []
    if match:
        founded = match.get("established")
        ror_id = match.get("id")
        geo = match.get("locations", [{}])[0].get("geonames_details", {})
        city = geo.get("name")
        latitude = geo.get("lat")
        longitude = geo.get("lng")
        for link in match.get("links", []):
            if link.get("type") == "website" and not website:
                website = link.get("value")
            if link.get("type") == "wikipedia" and not wikipedia:
                wikipedia = link.get("value")
        related = [
            rel["label"]
            for rel in match.get("relationships", [])
            if rel.get("type") == "child"
        ][:3]
    slug = slugify(row["name"])
    override = OFFICIAL_OVERRIDES.get(slug, {})
    match_name_score = canonical_name_score(row["name"], match) if match else 0
    metadata_source = "ror" if match else "none"
    if override.get("official_url"):
        website = override["official_url"]
    if match_name_score < 95:
        website = None
        wikipedia = None
        ror_id = None
        founded = None
        city = None
        latitude = None
        longitude = None
        related = []
    if override.get("official_url"):
        website = override["official_url"]
        metadata_source = "manual_override"
    if override.get("city"):
        city = override["city"]
    if override.get("founded"):
        founded = override["founded"]
    if latitude is None or longitude is None:
        latitude, longitude = resolve_coordinates(
            row["name"], city, row["country"], cache
        )
    if metadata_source == "manual_override":
        match_name_score = max(match_name_score, 95)
    if website and not trusted_official(row["name"], website):
        website = None
        wikipedia = None
        ror_id = None
        founded = None
        city = None
        related = []
    spotlight = SPOTLIGHTS.get(slug)
    strengths = spotlight["strengths"] if spotlight else generic_strengths(row["rank"])
    return {
        "rank": row["rank"],
        "rank_display": row.get("rank_display"),
        "name": row["name"],
        "slug": slug,
        "country": row["country"],
        "region": region_for(row["country"]),
        "city": city,
        "latitude": latitude,
        "longitude": longitude,
        "founded": founded,
        "official_url": website,
        "wikipedia_url": wikipedia,
        "ror_url": ror_id,
        "ranking_links": {
            "the": row["the_url"],
        },
        "metadata_source": metadata_source,
        "metadata_confidence": match_name_score,
        "scorecard": {
            "overall": row["overall_score"],
            "research": row["research_score"],
            "teaching": row["teaching_score"],
            "citations": row["citations_score"],
            "industry": row["industry_score"],
            "international": row["international_score"],
        },
        "department": spotlight["department"] if spotlight else None,
        "labs": spotlight["labs"] if spotlight else [],
        "selected_centers": related,
        "strengths": strengths,
        "spotlight": bool(spotlight),
    }


def format_url(path: str) -> str:
    return f"{SITE_URL}/{path.lstrip('./')}"


def topbar_html(prefix: str = "./") -> str:
    return f"""
    <div class=\"topbar-shell\">
      <div class=\"topbar\">
        <a class=\"author-link\" href=\"https://dmoliveira.github.io/my-cv-public/cv/human/\" target=\"_blank\" rel=\"noreferrer\">Made by <strong>Diego Marinho</strong></a>
        <nav class=\"topbar-nav\">
          <a href=\"{prefix}index.html#overview\">Global</a>
          <a href=\"{prefix}index.html#regions\">Regions</a>
          <a href=\"{prefix}methodology.html\">Methodology</a>
          <a href=\"{prefix}spotlight.html\">Spotlights</a>
          <a href=\"{prefix}support.html\">Support</a>
        </nav>
        <div class=\"theme-toggle\" role=\"group\" aria-label=\"Theme selector\">
          <button data-theme-option=\"auto\" class=\"theme-button\">Auto</button>
          <button data-theme-option=\"light\" class=\"theme-button\">Light</button>
          <button data-theme-option=\"dark\" class=\"theme-button\">Dark</button>
        </div>
      </div>
    </div>
    """


def footer_html(prefix: str = "./") -> str:
    return f"""
    <footer class=\"footer\">
      <p>A research-friendly directory for exploring top computer science, AI/ML, and data science universities worldwide.</p>
      <p>
        Made by <a href=\"https://dmoliveira.github.io/my-cv-public/cv/human/\" target=\"_blank\" rel=\"noreferrer\">Diego Marinho</a>
        · <a href=\"{prefix}methodology.html\">Methodology</a>
        · <a href=\"{prefix}support.html\">Support</a>
      </p>
    </footer>
    """


def page_head(
    title: str, description: str, canonical_path: str, og_type: str = "website"
) -> str:
    canonical = format_url(canonical_path)
    return f"""
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{escape(title)}</title>
    <meta name=\"description\" content=\"{escape(description)}\" />
    <link rel=\"canonical\" href=\"{canonical}\" />
    <meta property=\"og:type\" content=\"{og_type}\" />
    <meta property=\"og:title\" content=\"{escape(title)}\" />
    <meta property=\"og:description\" content=\"{escape(description)}\" />
    <meta property=\"og:url\" content=\"{canonical}\" />
    <meta property=\"og:image\" content=\"{format_url("assets/hero-banner.svg")}\" />
    <meta name=\"twitter:card\" content=\"summary_large_image\" />
    <meta name=\"twitter:title\" content=\"{escape(title)}\" />
    <meta name=\"twitter:description\" content=\"{escape(description)}\" />
    <link rel=\"stylesheet\" href=\"{("./" if "/" not in canonical_path else "../")}styles.css\" />
    <link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\" integrity=\"sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=\" crossorigin=\"\" />
    """


def itemlist_json(universities, base_path: str = "universities") -> str:
    items = []
    for u in universities:
        items.append(
            {
                "@type": "ListItem",
                "position": u["rank"],
                "name": u["name"],
                "url": format_url(f"{base_path}/{u['slug']}.html")
                if base_path
                else format_url(""),
            }
        )
    return json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": items,
        },
        ensure_ascii=False,
    )


def breadcrumb_json(items) -> str:
    return json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": name, "item": url}
                for i, (name, url) in enumerate(items)
            ],
        },
        ensure_ascii=False,
    )


def profile_link(university):
    return f"./universities/{university['slug']}.html"


def overview_rows_html(universities, limit=20):
    rows = []
    for u in universities[:limit]:
        dept = (
            f'<a href="{u["department"]["url"]}" target="_blank" rel="noreferrer">{escape(u["department"]["label"])}</a>'
            if u.get("department")
            else "—"
        )
        research = (
            " · ".join(
                f'<a href="{lab["url"]}" target="_blank" rel="noreferrer">{escape(lab["label"])}</a>'
                for lab in u.get("labs", [])[:2]
            )
            or "—"
        )
        title = escape(u["name"])
        if u.get("official_url"):
            title = f'<a class="university-link" href="{u["official_url"]}" target="_blank" rel="noreferrer"><strong>{title}</strong></a>'
        else:
            title = f"<strong>{title}</strong>"
        links = [
            f'<a href="{u["ranking_links"]["the"]}" target="_blank" rel="noreferrer">THE</a>'
        ]
        profile = profile_link(u)
        if profile:
            links.append(f'<a href="{profile}">Profile</a>')
        if u.get("spotlight"):
            links.append(f'<a href="./spotlight.html#{u["slug"]}">Spotlight</a>')
        rows.append(
            f'<tr><td data-label="Rank"><strong>{u["rank"]}</strong></td>'
            f'<td data-label="University">{title}<div class="muted">THE score: {escape(str(u["scorecard"]["overall"] or "—"))}</div></td>'
            f'<td data-label="Region">{escape(u["region"])}</td>'
            f'<td data-label="Founded">{escape(str(u["founded"] or "—"))}</td>'
            f'<td data-label="Location">{escape(", ".join([part for part in [u.get("city"), u["country"]] if part]))}</td>'
            f'<td data-label="Department / Research links"><div>{dept}</div><div class="muted">{research}</div></td>'
            f'<td data-label="Strong at">{"".join(f'<span class="tag">{escape(s)}</span>' for s in u.get("strengths", []))}</td>'
            f'<td data-label="Links">{" · ".join(links)}</td></tr>'
        )
    return "".join(rows)


def region_cards_html(universities):
    grouped = {}
    for u in universities:
        grouped.setdefault(u["region"], []).append(u)
    cards = []
    for region in sorted(grouped):
        slug = slugify(region)
        items = "".join(
            f"<li><strong>#{u['rank']}</strong> "
            + (
                f'<a class="region-list-link" href="{u["official_url"]}" target="_blank" rel="noreferrer">{escape(u["name"])}</a>'
                if u.get("official_url")
                else escape(u["name"])
            )
            + (
                f' · <a href="./regions/{slug}.html">region page</a>'
                if u is grouped[region][0]
                else ""
            )
            + "</li>"
            for u in grouped[region][:15]
        )
        cards.append(
            f'<article class="panel region-card"><h3>{escape(region)}</h3><p>{len(grouped[region])} universities · <a href="./regions/{slug}.html">Open region page</a></p><ol>{items}</ol></article>'
        )
    return "".join(cards)


def spotlight_cards_html(universities):
    cards = []
    for u in [u for u in universities if u.get("spotlight")]:
        cards.append(
            f'<article class="panel card" id="{u["slug"]}"><p class="eyebrow">Rank #{u["rank"]}</p><h3><a class="university-link" href="./universities/{u["slug"]}.html">{escape(u["name"])}</a></h3><div>{"".join(f'<span class="tag">{escape(s)}</span>' for s in u.get("strengths", []))}</div></article>'
        )
    return "".join(cards)


def replace_marker(text: str, marker: str, content: str) -> str:
    return re.sub(
        rf"(<!-- {marker}_START -->)(.*?)(<!-- {marker}_END -->)",
        rf"\1{content}\3",
        text,
        flags=re.S,
    )


def render_region_page(region: str, universities):
    slug = slugify(region)
    rows = "".join(
        f"<tr><td>#{u['rank']}</td><td>"
        + (
            f'<a class="university-link" href="../universities/{u["slug"]}.html">{escape(u["name"])}</a>'
            if u.get("slug")
            else (
                f'<a class="university-link" href="{u["official_url"]}" target="_blank" rel="noreferrer">{escape(u["name"])}</a>'
                if u.get("official_url")
                else escape(u["name"])
            )
        )
        + f'</td><td><a class="university-link" href="../countries/{slugify(u["country"])}.html">{escape(u["country"])}</a></td><td>{escape(str(u.get("founded") or "—"))}</td></tr>'
        for u in universities
    )
    intro = f"Explore {len(universities)} universities in {region} from the global top-200 directory for Computer Science, AI/ML, and Data Science."
    breadcrumb = breadcrumb_json(
        [("Home", format_url("")), (region, format_url(f"regions/{slug}.html"))]
    )
    return f"""<!doctype html><html lang=\"en\"><head>{page_head(f"{region} Universities for CS, AI/ML, and Data Science (2026)", f"Explore the top universities in {region} for Computer Science, AI/ML, and Data Science.", f"regions/{slug}.html")}<script type=\"application/ld+json\">{breadcrumb}</script><script type=\"application/ld+json\">{itemlist_json(universities)}</script></head><body>{topbar_html("../")}<main class=\"narrow\"><p><a href=\"../index.html#regions\">← Back to regions</a></p><h1>{escape(region)} universities</h1><div class=\"panel\"><p>{escape(intro)}</p><table><thead><tr><th>Rank</th><th>University</th><th>Country</th><th>Founded</th></tr></thead><tbody>{rows}</tbody></table></div>{footer_html("../")}</main><script src=\"../app.js\"></script></body></html>"""


def render_country_page(country: str, universities):
    slug = slugify(country)
    rows = "".join(
        f'<tr><td>#{u["rank"]}</td><td><a class="university-link" href="../universities/{u["slug"]}.html">{escape(u["name"])}</a></td><td>{escape(u["region"])}</td><td>{escape(str(u.get("founded") or "—"))}</td></tr>'
        for u in universities
    )
    strengths = sorted({s for u in universities for s in u.get("strengths", [])})[:3]
    intro = COUNTRY_INTROS.get(country)
    if not intro:
        strength_text = (
            ", ".join(strengths) if strengths else "computer science and AI research"
        )
        unit = "university" if len(universities) == 1 else "universities"
        intro = f"{country} appears in this directory with {len(universities)} {unit} spanning {strength_text}, giving a quick view of its strongest institutions in the 2026 top-200 list."
    breadcrumb = breadcrumb_json(
        [("Home", format_url("")), (country, format_url(f"countries/{slug}.html"))]
    )
    return f"""<!doctype html><html lang="en"><head>{page_head(f"{country} Universities for CS, AI/ML, and Data Science (2026)", f"Explore the top universities in {country} for Computer Science, AI/ML, and Data Science.", f"countries/{slug}.html")}<script type="application/ld+json">{breadcrumb}</script><script type="application/ld+json">{itemlist_json(universities)}</script></head><body>{topbar_html("../")}<main class="narrow"><p><a href="../index.html#overview">← Back to directory</a></p><h1>{escape(country)} universities</h1><div class="panel"><p>{escape(intro)}</p><table><thead><tr><th>Rank</th><th>University</th><th>Region</th><th>Founded</th></tr></thead><tbody>{rows}</tbody></table></div>{footer_html("../")}</main><script src="../app.js"></script></body></html>"""


def render_university_page(university):
    labs = (
        "".join(
            f'<li><a href="{lab["url"]}" target="_blank" rel="noreferrer">{escape(lab["label"])}</a></li>'
            for lab in university.get("labs", [])
        )
        or "<li>—</li>"
    )
    department = university.get("department")
    dept_html = (
        f'<a href="{department["url"]}" target="_blank" rel="noreferrer">{escape(department["label"])}</a>'
        if department
        else "—"
    )
    breadcrumb = breadcrumb_json(
        [
            ("Home", format_url("")),
            (
                university["region"],
                format_url(f"regions/{slugify(university['region'])}.html"),
            ),
            (university["name"], format_url(f"universities/{university['slug']}.html")),
        ]
    )
    return f"""<!doctype html><html lang=\"en\"><head>{page_head(f"{university['name']} · Top Universities for CS/AI/Data Science", f"Profile for {university['name']}, including rank, location, strengths, and research links.", f"universities/{university['slug']}.html", "article")}<script type=\"application/ld+json\">{breadcrumb}</script></head><body>{topbar_html("../")}<main class=\"narrow\"><p><a href=\"../index.html#overview\">← Back to directory</a></p><h1>{escape(university["name"])}</h1><div class=\"panel\"><p><strong>Rank:</strong> #{university["rank"]}</p><p><strong>Location:</strong> {escape(university.get("city") + ", " if university.get("city") else "")}<a class="university-link" href="../countries/{slugify(university["country"])}.html">{escape(university["country"])}</a></p><p><strong>Founded:</strong> {escape(str(university.get("founded") or "—"))}</p><p><strong>Official website:</strong> {f'<a href="{university["official_url"]}" target="_blank" rel="noreferrer">Visit</a>' if university.get("official_url") else "—"}</p><p><strong>THE ranking page:</strong> <a href=\"{university["ranking_links"]["the"]}\" target=\"_blank\" rel=\"noreferrer\">Open</a></p><p><strong>Department:</strong> {dept_html}</p><p><strong>Strengths:</strong> {"".join(f'<span class="tag">{escape(s)}</span>' for s in university.get("strengths", []))}</p><h2>Labs and centers</h2><ul>{labs}</ul><p class=\"muted\">This page is part of a curated directory based on THE Computer Science World University Rankings 2026 and is not an aggregated ranking.</p></div>{footer_html("../")}</main><script src=\"../app.js\"></script></body></html>"""


def build_static_site(metadata, universities):
    index_path = Path("docs/index.html")
    index_text = index_path.read_text(encoding="utf-8")
    counts = {}
    for u in universities:
        counts[u["region"]] = counts.get(u["region"], 0) + 1
    meta_html = (
        f"<h2>{escape(metadata['title'])}</h2><p>{escape(metadata['source_note'])}</p><p><strong>Updated:</strong> {metadata['updated_at']}</p>"
        + '<div class="badge-row">'
        + "".join(
            f'<span class="badge">{escape(region)}: {count}</span>'
            for region, count in sorted(counts.items())
        )
        + "</div>"
        + f'<p class="muted">Coverage: official links {metadata["coverage"]["official_url"]}/200 · founded year {metadata["coverage"]["founded"]}/200 · city {metadata["coverage"]["city"]}/200 · spotlight pages {metadata["coverage"]["spotlight"]}</p>'
    )
    index_text = replace_marker(index_text, "STATIC_META_SUMMARY", meta_html)
    index_text = replace_marker(
        index_text, "STATIC_OVERVIEW_ROWS", overview_rows_html(universities)
    )
    index_text = replace_marker(
        index_text, "STATIC_REGIONS", region_cards_html(universities)
    )
    index_text = replace_marker(
        index_text, "STATIC_SPOTLIGHTS", spotlight_cards_html(universities)
    )

    regions_dir = Path("docs/regions")
    regions_dir.mkdir(parents=True, exist_ok=True)
    grouped = {}
    for u in universities:
        grouped.setdefault(u["region"], []).append(u)
    for region, items in grouped.items():
        (regions_dir / f"{slugify(region)}.html").write_text(
            render_region_page(region, items), encoding="utf-8"
        )

    universities_dir = Path("docs/universities")
    universities_dir.mkdir(parents=True, exist_ok=True)
    for u in universities:
        (universities_dir / f"{u['slug']}.html").write_text(
            render_university_page(u), encoding="utf-8"
        )

    countries_dir = Path("docs/countries")
    countries_dir.mkdir(parents=True, exist_ok=True)
    by_country = {}
    for u in universities:
        by_country.setdefault(u["country"], []).append(u)
    for country, items in by_country.items():
        (countries_dir / f"{slugify(country)}.html").write_text(
            render_country_page(country, items), encoding="utf-8"
        )

    country_counts = sorted(by_country.items(), key=lambda kv: (-len(kv[1]), kv[0]))[
        :12
    ]
    country_cards = "".join(
        f'<article class="panel region-card"><h3>{escape(country)}</h3><p>{len(items)} universities · <a href="./countries/{slugify(country)}.html">Open country page</a></p><ol>'
        + "".join(
            f'<li><strong>#{u["rank"]}</strong> <a class="region-list-link" href="./universities/{u["slug"]}.html">{escape(u["name"])}</a></li>'
            for u in items[:10]
        )
        + "</ol></article>"
        for country, items in country_counts
    )
    index_text = replace_marker(index_text, "STATIC_COUNTRIES", country_cards)
    index_path.write_text(index_text, encoding="utf-8")

    robots = "User-agent: *\nAllow: /\nSitemap: https://dmoliveira.github.io/top-uni/sitemap.xml\n"
    Path("docs/robots.txt").write_text(robots, encoding="utf-8")

    urls = ["", "methodology.html", "spotlight.html", "support.html"]
    urls += [f"regions/{slugify(region)}.html" for region in grouped]
    urls += [f"countries/{slugify(country)}.html" for country in by_country]
    urls += [f"universities/{u['slug']}.html" for u in universities]
    sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in urls:
        sitemap.append(f"  <url><loc>{format_url(url)}</loc></url>")
    sitemap.append("</urlset>")
    Path("docs/sitemap.xml").write_text("\n".join(sitemap), encoding="utf-8")


def main():
    rows = load_the_top_200()
    cache = load_geocode_cache()
    universities = []
    for idx, row in enumerate(rows, start=1):
        universities.append(build_record(row, cache))
        if idx % 20 == 0:
            time.sleep(1)

    if len(universities) != 200:
        raise RuntimeError(f"Expected 200 universities, got {len(universities)}")
    slugs = [u["slug"] for u in universities]
    if len(slugs) != len(set(slugs)):
        raise RuntimeError("Duplicate university slugs detected.")
    spotlight_missing = sorted(set(SPOTLIGHTS) - set(slugs))
    if spotlight_missing:
        raise RuntimeError(
            f"Spotlights missing from top-200 dataset: {spotlight_missing}"
        )

    coverage = {
        "official_url": sum(1 for u in universities if u.get("official_url")),
        "founded": sum(1 for u in universities if u.get("founded")),
        "city": sum(1 for u in universities if u.get("city")),
        "department": sum(1 for u in universities if u.get("department")),
        "spotlight": sum(1 for u in universities if u.get("spotlight")),
    }

    metadata = {
        "title": "Top 200 Computer Science, AI/ML, and Data Science Universities",
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "updated_year": datetime.now(timezone.utc).strftime("%Y"),
        "source_note": "Curated from the Times Higher Education Computer Science World University Rankings 2026 top 200, then enriched with ROR institutional metadata and official research links for spotlight universities.",
        "coverage": coverage,
        "methodology": [
            "Primary ranked list: THE Computer Science World University Rankings 2026 top 200.",
            "Metadata enrichment: Research Organization Registry (ROR) for official websites, location, and founding year when available.",
            "Spotlight pages: hand-curated official department/lab links and notable research references for especially influential universities.",
            "Use this project as a practical research directory, not as an official institutional ranking publication.",
        ],
    }

    with open("docs/data/universities.json", "w", encoding="utf-8") as fh:
        json.dump(
            {"meta": metadata, "universities": universities},
            fh,
            ensure_ascii=False,
            indent=2,
        )

    with open("docs/data/spotlights.json", "w", encoding="utf-8") as fh:
        json.dump(
            {
                "updated_at": metadata["updated_at"],
                "spotlights": [
                    {
                        "slug": slug,
                        "name": next(
                            (u["name"] for u in universities if u["slug"] == slug), slug
                        ),
                        **details,
                    }
                    for slug, details in SPOTLIGHTS.items()
                ],
            },
            fh,
            ensure_ascii=False,
            indent=2,
        )

    build_static_site(metadata, universities)

    print(f"Built dataset for {len(universities)} universities.")


if __name__ == "__main__":
    main()
