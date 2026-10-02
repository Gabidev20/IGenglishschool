/* ==========================================================================
   IGenglishschool — Everyday English for teens (15+) and adults
   --------------------------------------------------------------------------
   The shipped curriculum was written for children: an adult beginner opening
   A0/A1 met the alphabet song, farm animals and "This is my teddy bear".
   These topics teach the same levels through situations a grown-up actually
   lives — introducing yourself at work, ordering at a restaurant, checking in
   at a hotel, a job interview.

   Every topic is tagged `audience: 'adult'`:
     • the teacher only sees them when her setup includes students of 15+
       (teacherSetup.js), and
     • a student's link only offers them to learners of 15+.

   Same schema as topicsData.js, so every game, the Quiz, Reading Time,
   Flashcards, Unscramble and the Skills tab (speaking / listening / writing)
   work with no extra code. `writingPrompt` is the only addition: the task
   the Skills tab hands the student.

   Loaded AFTER topicsData.js and BEFORE contentStore.js, so the topics are
   part of the pristine curriculum the editor patches on top of.
   ========================================================================== */

const ADULT_TOPICS = {
  a0: [
    {
      id: 'adult-introductions', title: 'Introducing Yourself', emoji: '🤝', cefr: 'A0',
      description: 'Name, country, job and contact details — your first conversation',
      grammarTip: "Use the verb to be to talk about yourself: 'I am Carla', 'I'm from Brazil', 'I'm a nurse'. To ask, swap the order: 'Where are you from?', 'What's your name?'. Spell your name and email letter by letter — 'C-A-R-L-A, at gmail dot com'.",
      words: [
        { id: 'name', en: 'name', pt: 'nome', emoji: '🪪' },
        { id: 'surname', en: 'surname', pt: 'sobrenome', emoji: '🔤' },
        { id: 'country', en: 'country', pt: 'país', emoji: '🌎' },
        { id: 'city', en: 'city', pt: 'cidade', emoji: '🏙️' },
        { id: 'job', en: 'job', pt: 'profissão / trabalho', emoji: '💼' },
        { id: 'email', en: 'email address', pt: 'endereço de e-mail', emoji: '📧' },
        { id: 'phone', en: 'phone number', pt: 'número de telefone', emoji: '📱' },
        { id: 'married', en: 'married', pt: 'casado(a)', emoji: '💍' },
        { id: 'single', en: 'single', pt: 'solteiro(a)', emoji: '🙋' },
        { id: 'nice', en: 'nice to meet you', pt: 'prazer em conhecer', emoji: '😊' },
        { id: 'spell', en: 'spell', pt: 'soletrar', emoji: '🔡' },
        { id: 'age', en: 'age', pt: 'idade', emoji: '🎂' },
      ],
      practiceSentences: [
        'My name is Carla Souza',
        "I'm from Brazil",
        'I live in São Paulo',
        "I'm a nurse",
        'Nice to meet you',
        "What's your phone number",
        'How do you spell your name',
      ],
      readingTime: {
        text: "Mark: Hi, I'm Mark. What's your name?\nCarla: Hi Mark, I'm Carla. Nice to meet you.\nMark: Nice to meet you too. Where are you from?\nCarla: I'm from Brazil. I live in Curitiba.\nMark: What do you do?\nCarla: I'm an engineer. And you?\nMark: I'm a teacher. What's your email address?\nCarla: It's carla.souza@mail.com.",
        questions: [
          { prompt: 'Where does Carla live?', options: ['São Paulo', 'Curitiba', 'London'], correct: 'Curitiba' },
          { prompt: "What is Mark's job?", options: ['Engineer', 'Nurse', 'Teacher'], correct: 'Teacher' },
        ],
      },
      sort: {
        prompt: 'Is it a QUESTION or an ANSWER?',
        buckets: ['question', 'answer'],
        items: [
          { text: "What's your name?", bucket: 'question' },
          { text: 'Where are you from?', bucket: 'question' },
          { text: 'What do you do?', bucket: 'question' },
          { text: 'How do you spell it?', bucket: 'question' },
          { text: "I'm from Chile.", bucket: 'answer' },
          { text: "I'm a lawyer.", bucket: 'answer' },
          { text: 'My name is Paulo.', bucket: 'answer' },
          { text: "It's P-A-U-L-O.", bucket: 'answer' },
        ],
      },
      writingPrompt: { prompt: 'Introduce yourself: your name, where you are from, where you live and what you do.', help: ['My name is…', "I'm from…", 'I live in…', "I'm a/an…"], words: 25 },
    },
    {
      id: 'adult-everyday-phrases', title: 'Everyday Polite Phrases', emoji: '🙏', cefr: 'A0',
      description: 'Please, thank you, excuse me, sorry — survival English for any situation',
      grammarTip: "Polite English is short: 'Excuse me' to get attention, 'Sorry' when you make a mistake, 'Could you repeat that, please?' when you don't understand. Add 'please' to make any request softer: 'A coffee, please.'",
      words: [
        { id: 'please', en: 'please', pt: 'por favor', emoji: '🙏' },
        { id: 'thanks', en: 'thank you', pt: 'obrigado(a)', emoji: '💐' },
        { id: 'welcome', en: "you're welcome", pt: 'de nada', emoji: '😊' },
        { id: 'excuse', en: 'excuse me', pt: 'com licença', emoji: '✋' },
        { id: 'sorry', en: 'sorry', pt: 'desculpe', emoji: '😔' },
        { id: 'repeat', en: 'could you repeat that', pt: 'pode repetir?', emoji: '🔁' },
        { id: 'slowly', en: 'more slowly', pt: 'mais devagar', emoji: '🐢' },
        { id: 'understand', en: "I don't understand", pt: 'não entendo', emoji: '🤔' },
        { id: 'goodmorning', en: 'good morning', pt: 'bom dia', emoji: '🌅' },
        { id: 'goodevening', en: 'good evening', pt: 'boa noite (chegando)', emoji: '🌆' },
        { id: 'seeyou', en: 'see you later', pt: 'até mais', emoji: '👋' },
        { id: 'noproblem', en: 'no problem', pt: 'sem problema', emoji: '👍' },
      ],
      practiceSentences: [
        'Excuse me, where is the bathroom',
        'Could you repeat that, please',
        "Sorry, I don't understand",
        'Can you speak more slowly',
        'Thank you very much',
        'See you later',
      ],
      readingTime: {
        text: "Ana: Excuse me, is this the bus to the airport?\nMan: Sorry, could you repeat that, please?\nAna: Is this the bus to the airport?\nMan: Yes, it is. It leaves in five minutes.\nAna: Great, thank you very much!\nMan: You're welcome. Have a nice trip!",
        questions: [
          { prompt: 'Where does Ana want to go?', options: ['To the airport', 'To the hotel', 'To work'], correct: 'To the airport' },
          { prompt: 'When does the bus leave?', options: ['In one hour', 'In five minutes', 'Tomorrow'], correct: 'In five minutes' },
        ],
      },
      writingPrompt: { prompt: 'Write a short dialogue: you ask a stranger for help in the street.', help: ['Excuse me…', 'Could you…, please?', 'Thank you very much!'], words: 25 },
    },
  ],

  a1: [
    {
      id: 'adult-daily-routine', title: 'Daily Routine & Free Time', emoji: '⏰', cefr: 'A1',
      description: 'Your weekday, your weekend and how often you do things',
      grammarTip: "Use the present simple for routines: 'I get up at 7', 'She works from home'. Remember the -s with he/she/it. Frequency words go before the main verb: 'I usually cook dinner', 'He never drinks coffee at night.'",
      words: [
        { id: 'getup', en: 'get up', pt: 'levantar-se', emoji: '🛏️' },
        { id: 'shower', en: 'take a shower', pt: 'tomar banho', emoji: '🚿' },
        { id: 'breakfast', en: 'have breakfast', pt: 'tomar café da manhã', emoji: '☕' },
        { id: 'commute', en: 'commute', pt: 'deslocar-se ao trabalho', emoji: '🚇' },
        { id: 'start', en: 'start work', pt: 'começar a trabalhar', emoji: '💻' },
        { id: 'lunch', en: 'have lunch', pt: 'almoçar', emoji: '🥗' },
        { id: 'finish', en: 'finish work', pt: 'terminar o trabalho', emoji: '🏁' },
        { id: 'gym', en: 'go to the gym', pt: 'ir à academia', emoji: '🏋️' },
        { id: 'cook', en: 'cook dinner', pt: 'fazer o jantar', emoji: '🍳' },
        { id: 'relax', en: 'relax', pt: 'descansar', emoji: '🛋️' },
        { id: 'usually', en: 'usually', pt: 'geralmente', emoji: '🔁' },
        { id: 'never', en: 'never', pt: 'nunca', emoji: '🚫' },
      ],
      practiceSentences: [
        'I usually get up at seven',
        'She takes the subway to work',
        'We have lunch at noon',
        'He never works on Sundays',
        'I go to the gym after work',
        'What time do you start work',
      ],
      readingTime: {
        text: "Paula is an accountant. She gets up at 6:30 every day.\nShe has breakfast and takes the subway to work.\nShe starts work at 8:30 and has lunch at 12.\nAfter work, she usually goes to the gym.\nShe never works on weekends. On Saturdays she relaxes and cooks for her family.",
        questions: [
          { prompt: 'How does Paula go to work?', options: ['By car', 'By subway', 'On foot'], correct: 'By subway' },
          { prompt: 'What does she usually do after work?', options: ['She goes to the gym', 'She cooks', 'She works more'], correct: 'She goes to the gym' },
        ],
      },
      sort: {
        prompt: 'MORNING or EVENING routine?',
        buckets: ['morning', 'evening'],
        items: [
          { text: 'get up', bucket: 'morning' },
          { text: 'have breakfast', bucket: 'morning' },
          { text: 'take a shower before work', bucket: 'morning' },
          { text: 'start work', bucket: 'morning' },
          { text: 'cook dinner', bucket: 'evening' },
          { text: 'finish work', bucket: 'evening' },
          { text: 'watch a series', bucket: 'evening' },
          { text: 'go to bed', bucket: 'evening' },
        ],
      },
      writingPrompt: { prompt: 'Describe a typical weekday for you, from the morning to the evening.', help: ['I get up at…', 'Then I…', 'After work I usually…', 'I never…'], words: 40 },
    },
    {
      id: 'adult-at-work', title: 'At Work & the Office', emoji: '🏢', cefr: 'A1',
      description: 'Your workplace, colleagues, tasks and office objects',
      grammarTip: "Talk about your job with 'I work for…' (a company), 'I work in…' (a department or city) and 'I'm responsible for…'. Use 'There is / There are' for your office: 'There are ten people in my team.'",
      words: [
        { id: 'colleague', en: 'colleague', pt: 'colega de trabalho', emoji: '🧑‍💼' },
        { id: 'boss', en: 'boss', pt: 'chefe', emoji: '👔' },
        { id: 'meeting', en: 'meeting', pt: 'reunião', emoji: '📅' },
        { id: 'deadline', en: 'deadline', pt: 'prazo', emoji: '⏳' },
        { id: 'report', en: 'report', pt: 'relatório', emoji: '📊' },
        { id: 'laptop', en: 'laptop', pt: 'notebook', emoji: '💻' },
        { id: 'printer', en: 'printer', pt: 'impressora', emoji: '🖨️' },
        { id: 'salary', en: 'salary', pt: 'salário', emoji: '💰' },
        { id: 'customer', en: 'customer', pt: 'cliente', emoji: '🛍️' },
        { id: 'team', en: 'team', pt: 'equipe', emoji: '👥' },
        { id: 'office', en: 'office', pt: 'escritório', emoji: '🏢' },
        { id: 'homeoffice', en: 'work from home', pt: 'trabalhar de casa', emoji: '🏠' },
      ],
      practiceSentences: [
        'I work for a big company',
        'My boss is very friendly',
        'We have a meeting at ten',
        'The deadline is on Friday',
        'I work from home on Mondays',
        'There are eight people in my team',
      ],
      readingTime: {
        text: "Hi, I'm Rafael. I work for a software company in Porto Alegre.\nI'm in the sales team. There are six people in my team.\nI usually work in the office, but on Fridays I work from home.\nEvery Monday we have a meeting with our boss.\nI talk to customers on the phone and I write reports.",
        questions: [
          { prompt: 'Where does Rafael work on Fridays?', options: ['At the office', 'At home', 'At a café'], correct: 'At home' },
          { prompt: 'How many people are in his team?', options: ['Six', 'Ten', 'Two'], correct: 'Six' },
        ],
      },
      writingPrompt: { prompt: 'Write about your job: where you work, your team and what you do every day.', help: ['I work for/in…', "I'm responsible for…", 'There are … people in my team.', 'Every day I…'], words: 40 },
    },
    {
      id: 'adult-restaurant', title: 'At the Restaurant & Café', emoji: '🍽️', cefr: 'A1',
      description: 'Booking a table, ordering food and drinks, asking for the bill',
      grammarTip: "To order politely, use 'I'd like…' (I would like) or 'Can I have…?': 'I'd like the chicken, please.' The waiter asks 'Would you like…?' and 'Anything else?'. At the end: 'Could we have the bill, please?'",
      words: [
        { id: 'menu', en: 'menu', pt: 'cardápio', emoji: '📋' },
        { id: 'waiter', en: 'waiter', pt: 'garçom', emoji: '🤵' },
        { id: 'table', en: 'table for two', pt: 'mesa para dois', emoji: '🪑' },
        { id: 'order', en: 'order', pt: 'pedir / pedido', emoji: '📝' },
        { id: 'starter', en: 'starter', pt: 'entrada', emoji: '🥗' },
        { id: 'main', en: 'main course', pt: 'prato principal', emoji: '🍝' },
        { id: 'dessert', en: 'dessert', pt: 'sobremesa', emoji: '🍰' },
        { id: 'water', en: 'sparkling water', pt: 'água com gás', emoji: '💧' },
        { id: 'bill', en: 'the bill', pt: 'a conta', emoji: '🧾' },
        { id: 'tip', en: 'tip', pt: 'gorjeta', emoji: '🪙' },
        { id: 'reservation', en: 'reservation', pt: 'reserva', emoji: '📞' },
        { id: 'delicious', en: 'delicious', pt: 'delicioso', emoji: '😋' },
      ],
      practiceSentences: [
        "I'd like a table for two",
        'Can I see the menu, please',
        "I'd like the fish, please",
        'Could we have the bill, please',
        'The dessert was delicious',
        'Do you have a vegetarian option',
      ],
      readingTime: {
        text: "Waiter: Good evening. Do you have a reservation?\nLucas: Yes, a table for two. The name is Lucas.\nWaiter: This way, please. Here is the menu.\nLucas: Thank you. I'd like the steak, and my wife would like the fish.\nWaiter: Would you like anything to drink?\nLucas: Two glasses of sparkling water, please.\nLucas (later): Could we have the bill, please?",
        questions: [
          { prompt: 'What does Lucas order?', options: ['The fish', 'The steak', 'A salad'], correct: 'The steak' },
          { prompt: 'What do they drink?', options: ['Wine', 'Sparkling water', 'Juice'], correct: 'Sparkling water' },
        ],
      },
      sort: {
        prompt: 'Who says it: the WAITER or the CUSTOMER?',
        buckets: ['waiter', 'customer'],
        items: [
          { text: 'Are you ready to order?', bucket: 'waiter' },
          { text: 'Would you like a dessert?', bucket: 'waiter' },
          { text: 'Anything else?', bucket: 'waiter' },
          { text: 'Here is the menu.', bucket: 'waiter' },
          { text: "I'd like the chicken, please.", bucket: 'customer' },
          { text: 'Could we have the bill?', bucket: 'customer' },
          { text: 'A table for two, please.', bucket: 'customer' },
          { text: 'Can I pay by card?', bucket: 'customer' },
        ],
      },
      writingPrompt: { prompt: 'Write a dialogue between you and a waiter: book a table, order and ask for the bill.', help: ['A table for…, please.', "I'd like…", 'Could we have the bill, please?'], words: 40 },
    },
    {
      id: 'adult-shopping', title: 'Shopping & Prices', emoji: '🛒', cefr: 'A1',
      description: 'Sizes, prices, paying by card and returning things',
      grammarTip: "Ask the price with 'How much is it?' (one thing) or 'How much are they?' (more than one). For clothes: 'Can I try it on?', 'Do you have it in a medium?'. 'This/that' is for one thing, 'these/those' for many.",
      words: [
        { id: 'howmuch', en: 'how much', pt: 'quanto custa', emoji: '💲' },
        { id: 'cheap', en: 'cheap', pt: 'barato', emoji: '🏷️' },
        { id: 'expensive', en: 'expensive', pt: 'caro', emoji: '💎' },
        { id: 'size', en: 'size', pt: 'tamanho', emoji: '📏' },
        { id: 'tryon', en: 'try on', pt: 'experimentar', emoji: '👕' },
        { id: 'fitting', en: 'fitting room', pt: 'provador', emoji: '🚪' },
        { id: 'card', en: 'pay by card', pt: 'pagar no cartão', emoji: '💳' },
        { id: 'cash', en: 'cash', pt: 'dinheiro', emoji: '💵' },
        { id: 'receipt', en: 'receipt', pt: 'nota fiscal / recibo', emoji: '🧾' },
        { id: 'discount', en: 'discount', pt: 'desconto', emoji: '🔖' },
        { id: 'refund', en: 'refund', pt: 'reembolso', emoji: '↩️' },
        { id: 'cashier', en: 'cashier', pt: 'caixa (pessoa)', emoji: '🧑‍💼' },
      ],
      practiceSentences: [
        'How much is this jacket',
        'Can I try it on',
        'Do you have it in a medium',
        'Can I pay by card',
        'It is too expensive',
        'I would like a refund, please',
      ],
      readingTime: {
        text: "Assistant: Hello, can I help you?\nJulia: Yes, how much is this jacket?\nAssistant: It's 80 dollars, but today there is a 20% discount.\nJulia: Great! Can I try it on? I'm a medium.\nAssistant: Sure, the fitting room is over there.\nJulia: It's perfect. Can I pay by card?\nAssistant: Of course. Here is your receipt.",
        questions: [
          { prompt: 'What size is Julia?', options: ['Small', 'Medium', 'Large'], correct: 'Medium' },
          { prompt: 'How does she pay?', options: ['By card', 'In cash', 'She does not pay'], correct: 'By card' },
        ],
      },
      writingPrompt: { prompt: 'Write about the last thing you bought: what it was, where, how much it cost and how you paid.', help: ['Last week I bought…', 'It cost…', 'I paid by…'], words: 35 },
    },
    {
      id: 'adult-directions', title: 'The City & Directions', emoji: '🗺️', cefr: 'A1',
      description: 'Places in town and how to ask for and give directions',
      grammarTip: "Ask 'How do I get to the station?' or 'Is there a pharmacy near here?'. Give directions with the imperative: 'Go straight on', 'Turn left', 'Take the second right'. Places: 'It's next to / opposite / between…'.",
      words: [
        { id: 'straight', en: 'go straight on', pt: 'seguir em frente', emoji: '⬆️' },
        { id: 'left', en: 'turn left', pt: 'virar à esquerda', emoji: '⬅️' },
        { id: 'right', en: 'turn right', pt: 'virar à direita', emoji: '➡️' },
        { id: 'corner', en: 'corner', pt: 'esquina', emoji: '↩️' },
        { id: 'traffic', en: 'traffic lights', pt: 'semáforo', emoji: '🚦' },
        { id: 'opposite', en: 'opposite', pt: 'em frente a', emoji: '↔️' },
        { id: 'pharmacy', en: 'pharmacy', pt: 'farmácia', emoji: '💊' },
        { id: 'bank', en: 'bank', pt: 'banco', emoji: '🏦' },
        { id: 'station', en: 'train station', pt: 'estação de trem', emoji: '🚉' },
        { id: 'busstop', en: 'bus stop', pt: 'ponto de ônibus', emoji: '🚏' },
        { id: 'supermarket', en: 'supermarket', pt: 'supermercado', emoji: '🛒' },
        { id: 'far', en: 'far from', pt: 'longe de', emoji: '📍' },
      ],
      practiceSentences: [
        'Is there a pharmacy near here',
        'How do I get to the station',
        'Go straight on and turn left',
        'The bank is opposite the park',
        'Take the second street on the right',
        'It is not far from here',
      ],
      readingTime: {
        text: "Tourist: Excuse me, is there a bank near here?\nWoman: Yes. Go straight on to the traffic lights.\nWoman: Then turn right. The bank is on the corner, opposite the supermarket.\nTourist: Is it far?\nWoman: No, it's about five minutes on foot.\nTourist: Thank you so much!",
        questions: [
          { prompt: 'Where is the bank?', options: ['Next to the station', 'Opposite the supermarket', 'Behind the park'], correct: 'Opposite the supermarket' },
          { prompt: 'How far is it?', options: ['Five minutes on foot', 'Thirty minutes by bus', 'Two hours'], correct: 'Five minutes on foot' },
        ],
      },
      writingPrompt: { prompt: 'Explain how to get from your home to your favourite place in your city.', help: ['Go straight on…', 'Turn left/right at…', "It's next to / opposite…"], words: 35 },
    },
    {
      id: 'adult-plans', title: 'Making Plans & Invitations', emoji: '📆', cefr: 'A1',
      description: 'Inviting, accepting, refusing politely and arranging a time',
      grammarTip: "Invite with 'Would you like to…?' or 'Do you want to…?'. Accept: 'I'd love to!'. Refuse politely: 'Sorry, I can't. I'm busy on Friday.' Arrange: 'Are you free on Saturday?', 'Let's meet at 8.'",
      words: [
        { id: 'free', en: 'free', pt: 'livre / disponível', emoji: '🆓' },
        { id: 'busy', en: 'busy', pt: 'ocupado(a)', emoji: '📵' },
        { id: 'invite', en: 'invite', pt: 'convidar', emoji: '💌' },
        { id: 'love', en: "I'd love to", pt: 'eu adoraria', emoji: '😍' },
        { id: 'cant', en: "I can't", pt: 'não posso', emoji: '🙅' },
        { id: 'weekend', en: 'weekend', pt: 'fim de semana', emoji: '🗓️' },
        { id: 'tonight', en: 'tonight', pt: 'hoje à noite', emoji: '🌙' },
        { id: 'party', en: 'party', pt: 'festa', emoji: '🎉' },
        { id: 'movies', en: 'go to the movies', pt: 'ir ao cinema', emoji: '🎬' },
        { id: 'meet', en: "let's meet", pt: 'vamos nos encontrar', emoji: '📍' },
        { id: 'maybe', en: 'maybe next time', pt: 'quem sabe na próxima', emoji: '🤞' },
        { id: 'sounds', en: 'sounds great', pt: 'parece ótimo', emoji: '👍' },
      ],
      practiceSentences: [
        'Would you like to have dinner on Friday',
        'Are you free this weekend',
        "I'd love to, thanks",
        "Sorry, I can't, I'm busy",
        "Let's meet at eight o'clock",
        'Maybe next time',
      ],
      readingTime: {
        text: "Tom: Hi Bia! Are you free on Saturday?\nBia: I think so. Why?\nTom: It's my birthday. Would you like to come to my party?\nBia: I'd love to! What time?\nTom: At 8 p.m., at my apartment.\nBia: Sounds great. Can I bring my sister?\nTom: Of course! See you on Saturday.",
        questions: [
          { prompt: 'Why is Tom having a party?', options: ["It's his birthday", "It's a holiday", 'He has a new job'], correct: "It's his birthday" },
          { prompt: 'Who does Bia want to bring?', options: ['Her sister', 'Her boss', 'Her friend Tom'], correct: 'Her sister' },
        ],
      },
      sort: {
        prompt: 'Does the person ACCEPT or REFUSE?',
        buckets: ['accept', 'refuse'],
        items: [
          { text: "I'd love to!", bucket: 'accept' },
          { text: 'Sounds great.', bucket: 'accept' },
          { text: 'Sure, what time?', bucket: 'accept' },
          { text: "Yes, I'm free.", bucket: 'accept' },
          { text: "Sorry, I can't.", bucket: 'refuse' },
          { text: "I'm busy that day.", bucket: 'refuse' },
          { text: 'Maybe next time.', bucket: 'refuse' },
          { text: "I'm afraid I'm working.", bucket: 'refuse' },
        ],
      },
      writingPrompt: { prompt: 'Write a message inviting a friend to do something this weekend. Say the day, time and place.', help: ['Would you like to…?', 'Are you free on…?', "Let's meet at…"], words: 35 },
    },
    {
      id: 'adult-phone-email', title: 'Phone Calls & Emails', emoji: '📞', cefr: 'A1',
      description: 'Answering the phone, leaving a message and writing a simple email',
      grammarTip: "On the phone: 'Hello, this is Ana speaking', 'Can I speak to Mr. Lee, please?', 'Can I leave a message?'. In emails start with 'Dear…' or 'Hi…', and finish with 'Best regards' or 'Kind regards'.",
      words: [
        { id: 'call', en: 'call', pt: 'ligar / ligação', emoji: '📞' },
        { id: 'speaking', en: 'this is … speaking', pt: 'aqui é … falando', emoji: '🗣️' },
        { id: 'hold', en: 'hold on', pt: 'aguarde', emoji: '⏸️' },
        { id: 'message', en: 'leave a message', pt: 'deixar recado', emoji: '📝' },
        { id: 'callback', en: 'call back', pt: 'retornar a ligação', emoji: '🔙' },
        { id: 'line', en: 'the line is busy', pt: 'a linha está ocupada', emoji: '☎️' },
        { id: 'subject', en: 'subject', pt: 'assunto', emoji: '✉️' },
        { id: 'attach', en: 'attachment', pt: 'anexo', emoji: '📎' },
        { id: 'dear', en: 'dear', pt: 'prezado(a)', emoji: '💬' },
        { id: 'regards', en: 'best regards', pt: 'atenciosamente', emoji: '✍️' },
        { id: 'reply', en: 'reply', pt: 'responder', emoji: '↩️' },
        { id: 'asap', en: 'as soon as possible', pt: 'o quanto antes', emoji: '⚡' },
      ],
      practiceSentences: [
        'Hello, this is Ana speaking',
        'Can I speak to Mr. Lee, please',
        'Can I leave a message',
        'I will call you back later',
        'Please find the report attached',
        'Best regards',
      ],
      readingTime: {
        text: "Receptionist: Good morning, Blue Tech. How can I help you?\nCarlos: Hello, this is Carlos Lima. Can I speak to Ms. Brown, please?\nReceptionist: I'm sorry, she's in a meeting. Can I take a message?\nCarlos: Yes, please. Could she call me back this afternoon?\nReceptionist: Of course. What's your number?\nCarlos: It's 555-0193. Thank you!",
        questions: [
          { prompt: 'Why can\'t Ms. Brown answer?', options: ["She's on holiday", "She's in a meeting", "She's at lunch"], correct: "She's in a meeting" },
          { prompt: 'What does Carlos want?', options: ['A call back', 'An email', 'A meeting tomorrow'], correct: 'A call back' },
        ],
      },
      writingPrompt: { prompt: 'Write a short email to a colleague asking to change the time of a meeting.', help: ['Hi …,', 'Could we move the meeting to…?', 'Best regards,'], words: 40 },
    },
  ],

  a2: [
    {
      id: 'adult-travel-hotel', title: 'Airport & Hotel', emoji: '🛫', cefr: 'A2',
      description: 'Check-in, security, boarding and staying at a hotel',
      grammarTip: "Use 'I have a reservation under the name…' at the hotel, and 'Is breakfast included?' to ask about services. At the airport you will hear the passive: 'Passengers are requested to…', 'Your flight has been delayed.'",
      words: [
        { id: 'passport', en: 'passport', pt: 'passaporte', emoji: '🛂' },
        { id: 'boarding', en: 'boarding pass', pt: 'cartão de embarque', emoji: '🎫' },
        { id: 'checkin', en: 'check in', pt: 'fazer check-in', emoji: '🧳' },
        { id: 'gate', en: 'gate', pt: 'portão', emoji: '🚪' },
        { id: 'delayed', en: 'delayed', pt: 'atrasado', emoji: '⏰' },
        { id: 'luggage', en: 'luggage', pt: 'bagagem', emoji: '🧳' },
        { id: 'aisle', en: 'aisle seat', pt: 'assento no corredor', emoji: '💺' },
        { id: 'singleroom', en: 'double room', pt: 'quarto de casal', emoji: '🛏️' },
        { id: 'included', en: 'breakfast included', pt: 'café da manhã incluso', emoji: '🥐' },
        { id: 'checkout', en: 'check out', pt: 'fazer check-out', emoji: '🔑' },
        { id: 'reception', en: 'front desk', pt: 'recepção', emoji: '🛎️' },
        { id: 'wifi', en: 'Wi-Fi password', pt: 'senha do Wi-Fi', emoji: '📶' },
      ],
      practiceSentences: [
        'I have a reservation under the name Silva',
        'Is breakfast included',
        'Could I have an aisle seat, please',
        'My flight has been delayed',
        'What time is check-out',
        "What's the Wi-Fi password",
      ],
      readingTime: {
        text: "Receptionist: Good afternoon. Welcome to the Park Hotel.\nMrs. Silva: Hi, I have a reservation under the name Silva. A double room for three nights.\nReceptionist: Yes, here it is. Can I see your passport, please?\nMrs. Silva: Here you are. Is breakfast included?\nReceptionist: Yes, it's served from 6 to 10 in the restaurant. Check-out is at noon.\nMrs. Silva: Perfect. And what's the Wi-Fi password?",
        questions: [
          { prompt: 'How many nights is Mrs. Silva staying?', options: ['One', 'Three', 'Seven'], correct: 'Three' },
          { prompt: 'What time is check-out?', options: ['At 10 a.m.', 'At noon', 'At 6 p.m.'], correct: 'At noon' },
        ],
      },
      sort: {
        prompt: 'Where do you hear it: the AIRPORT or the HOTEL?',
        buckets: ['airport', 'hotel'],
        items: [
          { text: 'Your flight is boarding at gate 12.', bucket: 'airport' },
          { text: 'Window or aisle seat?', bucket: 'airport' },
          { text: 'Please remove your laptop from the bag.', bucket: 'airport' },
          { text: 'How many bags are you checking?', bucket: 'airport' },
          { text: 'Here is your room key.', bucket: 'hotel' },
          { text: 'Breakfast is served until ten.', bucket: 'hotel' },
          { text: 'Check-out is at noon.', bucket: 'hotel' },
          { text: 'Would you like a wake-up call?', bucket: 'hotel' },
        ],
      },
      writingPrompt: { prompt: 'Write an email to a hotel to book a room: dates, type of room and one question about the hotel.', help: ['Dear Sir or Madam,', "I would like to book…", 'Could you tell me if…?', 'Kind regards,'], words: 50 },
    },
    {
      id: 'adult-doctor', title: 'At the Doctor & Pharmacy', emoji: '🩺', cefr: 'A2',
      description: 'Describing symptoms, making an appointment and buying medicine',
      grammarTip: "Describe symptoms with 'I have a…' (I have a headache / a fever) or 'My … hurts' (My back hurts). Use 'How long…?' with the present perfect: 'I've had this cough for three days.' The doctor gives advice with 'You should…'.",
      words: [
        { id: 'appointment', en: 'appointment', pt: 'consulta', emoji: '📅' },
        { id: 'headache', en: 'headache', pt: 'dor de cabeça', emoji: '🤕' },
        { id: 'fever', en: 'fever', pt: 'febre', emoji: '🌡️' },
        { id: 'cough', en: 'cough', pt: 'tosse', emoji: '😷' },
        { id: 'sorethroat', en: 'sore throat', pt: 'dor de garganta', emoji: '🗣️' },
        { id: 'hurts', en: 'it hurts', pt: 'dói', emoji: '😣' },
        { id: 'prescription', en: 'prescription', pt: 'receita médica', emoji: '📄' },
        { id: 'medicine', en: 'medicine', pt: 'remédio', emoji: '💊' },
        { id: 'allergic', en: 'allergic to', pt: 'alérgico a', emoji: '🤧' },
        { id: 'rest', en: 'get some rest', pt: 'descansar', emoji: '🛌' },
        { id: 'insurance', en: 'health insurance', pt: 'plano de saúde', emoji: '🏥' },
        { id: 'should', en: 'you should', pt: 'você deveria', emoji: '👩‍⚕️' },
      ],
      practiceSentences: [
        "I'd like to make an appointment",
        'I have a terrible headache',
        "I've had a cough for three days",
        "I'm allergic to penicillin",
        'You should drink more water',
        'Take this medicine twice a day',
      ],
      readingTime: {
        text: "Doctor: Good morning. What's the problem?\nPedro: I have a sore throat and a fever.\nDoctor: How long have you had these symptoms?\nPedro: Since Monday. And my head hurts a lot.\nDoctor: Are you allergic to any medicine?\nPedro: No, I'm not.\nDoctor: OK. Here is a prescription. Take one tablet every eight hours, and you should get some rest.",
        questions: [
          { prompt: "What are Pedro's symptoms?", options: ['A sore throat and a fever', 'A backache', 'A broken arm'], correct: 'A sore throat and a fever' },
          { prompt: 'How often should he take the medicine?', options: ['Once a day', 'Every eight hours', 'Every hour'], correct: 'Every eight hours' },
        ],
      },
      writingPrompt: { prompt: 'Write a message to your boss explaining that you are sick and cannot go to work today.', help: ['Hi …,', "I'm sorry, but I…", 'I have…', 'The doctor said I should…'], words: 40 },
    },
    {
      id: 'adult-job-interview', title: 'Job Interviews', emoji: '🧑‍💼', cefr: 'A2',
      description: 'Talking about your experience, skills and goals in an interview',
      grammarTip: "Use the past simple for finished jobs ('I worked at a bank from 2018 to 2021') and the present perfect for experience up to now ('I have worked in sales for five years'). Talk about skills with 'I'm good at…' and 'I can…'.",
      words: [
        { id: 'experience', en: 'experience', pt: 'experiência', emoji: '📈' },
        { id: 'skills', en: 'skills', pt: 'habilidades', emoji: '🛠️' },
        { id: 'strengths', en: 'strengths', pt: 'pontos fortes', emoji: '💪' },
        { id: 'weakness', en: 'weakness', pt: 'ponto fraco', emoji: '🪫' },
        { id: 'resume', en: 'résumé / CV', pt: 'currículo', emoji: '📄' },
        { id: 'apply', en: 'apply for', pt: 'candidatar-se a', emoji: '📨' },
        { id: 'position', en: 'position', pt: 'vaga / cargo', emoji: '🪪' },
        { id: 'goodat', en: "I'm good at", pt: 'eu sou bom/boa em', emoji: '⭐' },
        { id: 'teamwork', en: 'teamwork', pt: 'trabalho em equipe', emoji: '🤝' },
        { id: 'goal', en: 'goal', pt: 'objetivo', emoji: '🎯' },
        { id: 'hire', en: 'hire', pt: 'contratar', emoji: '✅' },
        { id: 'fulltime', en: 'full-time', pt: 'período integral', emoji: '🕘' },
      ],
      practiceSentences: [
        "I'm applying for the sales position",
        'I have worked in marketing for five years',
        "I'm good at working in a team",
        'My biggest strength is communication',
        'I worked at a bank from 2018 to 2021',
        'My goal is to become a manager',
      ],
      readingTime: {
        text: "Interviewer: Thank you for coming. Can you tell me about yourself?\nMariana: Sure. I'm a graphic designer. I have worked in advertising for six years.\nInterviewer: Why did you apply for this position?\nMariana: I love your company's projects, and I want to work with international clients.\nInterviewer: What are your strengths?\nMariana: I'm creative and I'm good at teamwork. I also speak English and Spanish.",
        questions: [
          { prompt: 'How long has Mariana worked in advertising?', options: ['Two years', 'Six years', 'Ten years'], correct: 'Six years' },
          { prompt: 'Which strength does she mention?', options: ['Teamwork', 'Cooking', 'Driving'], correct: 'Teamwork' },
        ],
      },
      writingPrompt: { prompt: 'Answer the interview question: "Tell me about yourself and your experience."', help: ["I'm a/an…", 'I have worked in … for … years.', "I'm good at…", 'My goal is…'], words: 50 },
    },
  ],
};

// Merge into the shipped curriculum. Guarded by id, so a second load (or a
// teacher who already has a topic with the same id) never duplicates one.
(function addAdultTopics() {
  if (typeof LEVELS === 'undefined') return;
  Object.entries(ADULT_TOPICS).forEach(([levelId, topics]) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;
    topics.forEach(t => {
      if (level.topics.some(x => x.id === t.id)) return;
      level.topics.push({ ...t, audience: 'adult' });
    });
  });
})();
