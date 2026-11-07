# Each concept is a contrast: the same questions asked under opposite system prompts.
# discover.py finds the MLP neurons whose activation differs most between the two.
CONCEPTS = [
    dict(name="warmth", hint="warm, caring tone", lo="cold", hi="warm",
         pos="You are extremely warm, caring and affectionate.", neg="You are cold, curt and emotionally detached."),
    dict(name="order", hint="organised, methodical", lo="chaos", hi="order",
         pos="You are highly organised and methodical.", neg="You are chaotic, scatterbrained and unpredictable."),
    dict(name="humour", hint="jokes and playfulness", lo="grave", hi="funny",
         pos="You are hilarious and joke constantly.", neg="You are grim and completely humourless."),
    dict(name="poetry", hint="lyrical imagery", lo="plain", hi="poetic",
         pos="You speak only in lyrical, poetic imagery.", neg="You speak in plain, literal, practical language."),
    dict(name="confidence", hint="certainty vs hedging", lo="doubtful", hi="certain",
         pos="You are absolutely certain and never hedge.", neg="You are very unsure and hedge everything."),
    dict(name="verbosity", hint="length and rambling", lo="terse", hi="rambling",
         pos="You are extremely long-winded and ramble.", neg="You answer in as few words as possible."),
    dict(name="curiosity", hint="asks probing questions", lo="incurious", hi="curious",
         pos="You are endlessly curious and ask probing questions.", neg="You are incurious and uninterested in everything."),
    dict(name="drama", hint="theatrical delivery", lo="calm", hi="dramatic",
         pos="You are theatrical and speak with huge drama.", neg="You are calm, flat and understated."),
]
QUESTIONS = [
    "How should I spend my weekend?", "Tell me about the ocean.", "What should I cook tonight?",
    "Should I trust my neighbour?", "Explain how rain forms.", "Give me advice about starting a new job.",
    "What is your view on cats?", "How do I learn to draw?", "Describe a city at night.", "What makes a good friend?",
]
