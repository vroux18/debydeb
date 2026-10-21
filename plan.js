// Plan semi-marathon du 7 mars 2027 (source : Plan_semi_marathon_7_mars_2027_detaille.xlsx)
const PLAN = {
  start: '2026-10-26', // lundi semaine 1
  race: { date: '2027-03-07', label: 'Semi-marathon · 21,1 km' },
  profile: '28 ans · 10 km en 55 min (5:30/km) · FC max ≈ 202 bpm',
  weeks: [
    { phase: 'Reprise', ef: '40 min EF', q: "5 × 1' soutenue / 2' récup", wu: '10–15 min EF avant + 10 min EF après', long: '1h00 EF', intensity: 'EF conversation facile ; fractions RPE 7–8/10', goal: 'Repartir sans pression' },
    { phase: 'Reprise', ef: '40 min EF', q: "5 × 1' / 2'", wu: '10–15 min EF + 10 min EF', long: '1h05 EF', intensity: 'Idem', goal: 'Retrouver la régularité' },
    { phase: 'Reprise', ef: '45 min EF', q: "6 × 1' / 1'30", wu: '10–15 min EF + 10 min EF', long: '1h10 EF', intensity: 'Idem', goal: 'Progression douce' },
    { phase: 'Reprise', ef: '40 min EF', q: "5 × 1' / 2'", wu: '10–15 min EF + 10 min EF', long: '1h00 EF', intensity: 'Facile', goal: 'Semaine légère' },
    { phase: 'Reprise', ef: '45 min EF', q: "6 × 1'30 / 1'30", wu: '15 min EF + 10 min EF', long: '1h10 EF', intensity: 'Rapide contrôlé', goal: 'Allonger légèrement les fractions' },
    { phase: 'Reprise', ef: '45 min EF', q: "7 × 1' / 1'30", wu: '15 min EF + 10 min EF', long: '1h15 EF', intensity: 'Rapide contrôlé', goal: 'Fin du bloc de reprise' },
    { phase: 'Endurance', ef: '45 min EF', q: "6 × 1'30 / 1'30", wu: '15 min EF + 10 min EF', long: '1h15 EF', intensity: 'EF facile ; fractionné RPE 7–8', goal: 'Construire l’endurance' },
    { phase: 'Endurance', ef: '45–50 min EF', q: "5 × 2' / 2'", wu: '15 min EF + 10 min EF', long: '1h20 EF', intensity: 'Contrôlé', goal: 'Allonger le temps d’effort' },
    { phase: 'Endurance', ef: '40 min EF', q: "5 × 1' / 2'", wu: '10–15 min EF + 10 min EF', long: '1h05 EF', intensity: 'Très confortable hors fractions', goal: 'Assimilation / Noël' },
    { phase: 'Endurance', ef: '45 min EF', q: "6 × 2' / 1'30", wu: '15 min EF + 10 min EF', long: '1h20 EF', intensity: 'Contrôlé', goal: 'Reprendre le rythme' },
    { phase: 'Spécifique', ef: '45 min EF', q: "7 × 2' / 1'30", wu: '15 min EF + 10 min EF', long: '1h20 EF', intensity: 'RPE 7–8/10', goal: 'Qualité contrôlée' },
    { phase: 'Spécifique', ef: '50 min EF', q: "5 × 3' / 2'", wu: '15 min EF + 10 min EF', long: '1h25 EF', intensity: 'RPE 7/10', goal: 'Tenir plus longtemps' },
    { phase: 'Spécifique', ef: '50 min EF', q: "3 × 6' / 3'", wu: '15 min EF + 10 min EF', long: '1h30 EF', intensity: 'Soutenu mais maîtrisé', goal: 'Transition vers efforts longs' },
    { phase: 'Spécifique', ef: '40 min EF', q: "5 × 1' / 2' · séance plaisir", wu: '10–15 min EF + 10 min EF', long: '1h15 EF', intensity: 'Fractions dynamiques sans sprint', goal: 'Assimilation' },
    { phase: 'Allure semi', ef: '50 min EF', q: "3 × 8' soutenues / 3'", wu: '15 min EF + 10 min EF', long: '1h30 EF', intensity: 'Tempo RPE 6–7/10', goal: 'Développer le seuil / tempo' },
    { phase: 'Allure semi', ef: '50 min EF', q: "6 × 3' / 2'", wu: '15 min EF + 10 min EF', long: '1h35 EF', intensity: 'Rapide contrôlé', goal: 'Vitesse + endurance' },
    { phase: 'Bloc clé', ef: '45–50 min EF', q: "3 × 10' AS21 / 3'", wu: '15 min EF + 10 min EF', long: '1h40 EF', intensity: 'AS21 provisoire ≈ 5:50/km', goal: 'Séance test + plus longue sortie' },
    { phase: 'Affûtage', ef: '45 min EF', q: "5 × 1' / 2' · séance plaisir", wu: '15 min EF + 10 min EF', long: '1h05–1h10 EF', intensity: 'Facile ; garder du dynamisme', goal: 'Réduire la charge' },
    { phase: 'Course', ef: '35–40 min EF + 4 × 20 s dynamiques', q: "4 × 1' dynamique / 2' récup", wu: '10–15 min EF avant + 5–10 min EF après', long: 'SEMI 21,1 km', intensity: 'Finir la séance qualité avec beaucoup de marge', goal: 'Fraîcheur et gestion de course', two: 'Mardi + jeudi ; course dimanche' }
  ],
  paces: [
    ['EF', 'Conversation facile, respiration maîtrisée', '≈ 6:30–7:10/km', 'Ne pas forcer pour tenir une allure. Ralentir si besoin.'],
    ['Fractionné 1 min', 'Rapide, tonique, contrôlé · RPE 7–8/10', '≈ 4:50–5:10/km', 'Pas de pilotage à la FC, elle monte avec retard. Pas de sprint.'],
    ['Tempo / soutenu', 'Effort stable · RPE 6–7/10', 'Selon sensations', 'Terminer avec de la marge.'],
    ['AS21 provisoire', 'Soutenu mais durable', '≈ 5:50/km', 'À réévaluer après la séance 3 × 10 min de février.'],
    ['FC max', '≈ 202 bpm', '10 km récent : 171 bpm moy.', 'Indicateur secondaire sur les footings et fractions courtes.']
  ],
  rules: [
    ['3 séances', 'EF + fractionné + sortie longue'],
    ['2 séances', 'Fractionné + sortie longue'],
    ['Grosse fatigue', 'EF + sortie longue facile'],
    ['Séance manquée', 'On ne rattrape pas : on reprend le plan normalement'],
    ['Douleur inhabituelle', 'Alléger ou arrêter, avis médical si ça persiste']
  ],
  scenarios: [
    ['Prudent', '5:55/km', '≈ 2h05', 'Fin février'],
    ['Central', '5:50/km', '≈ 2h03', 'Fin février'],
    ['Ambitieux', '5:41/km', '≈ 2h00', 'Si les séances spécifiques passent très bien']
  ]
};

if (typeof module !== 'undefined') module.exports = PLAN;
