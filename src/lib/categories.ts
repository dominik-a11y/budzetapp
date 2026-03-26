export type CategoryType = 'income' | 'expense' | 'savings'

export interface CategoryTemplate {
  name: string
  type: CategoryType
  children: string[]
}

export const DEFAULT_CATEGORIES: CategoryTemplate[] = [
  {
    name: 'Przychody',
    type: 'income',
    children: [
      'Wynagrodzenie',
      'Wynagrodzenie Partnera/Partnerki',
      'Premia',
      'Przychody z premii bankowych',
      'Odsetki bankowe',
      'Sprzedaż na Allegro itp.',
      'Inne przychody',
    ],
  },
  {
    name: 'Jedzenie',
    type: 'expense',
    children: [
      'Jedzenie dom',
      'Jedzenie miasto',
      'Jedzenie praca',
      'Alkohol',
      'Inne',
    ],
  },
  {
    name: 'Mieszkanie / dom',
    type: 'expense',
    children: [
      'Czynsz',
      'Woda i kanalizacja',
      'Prąd',
      'Gaz',
      'Ogrzewanie',
      'Wywóz śmieci',
      'Konserwacja i naprawy',
      'Wyposażenie',
      'Ubezpieczenie nieruchomości',
      'Inne',
    ],
  },
  {
    name: 'Transport',
    type: 'expense',
    children: [
      'Paliwo do auta',
      'Przeglądy i naprawy auta',
      'Wyposażenie dodatkowe (opony)',
      'Ubezpieczenie auta',
      'Bilet komunikacji miejskiej',
      'Bilet PKP, PKS',
      'Taxi',
      'Inne',
    ],
  },
  {
    name: 'Telekomunikacja',
    type: 'expense',
    children: ['Telefon 1', 'Telefon 2', 'TV', 'Internet', 'Inne'],
  },
  {
    name: 'Opieka zdrowotna',
    type: 'expense',
    children: ['Lekarz', 'Badania', 'Lekarstwa', 'Inne'],
  },
  {
    name: 'Ubranie',
    type: 'expense',
    children: [
      'Ubranie zwykłe',
      'Ubranie sportowe',
      'Buty',
      'Dodatki',
      'Inne',
    ],
  },
  {
    name: 'Higiena',
    type: 'expense',
    children: [
      'Kosmetyki',
      'Środki czystości (chemia)',
      'Fryzjer',
      'Kosmetyczka',
      'Inne',
    ],
  },
  {
    name: 'Dzieci',
    type: 'expense',
    children: [
      'Artykuły szkolne',
      'Dodatkowe zajęcia',
      'Wpłaty na szkołę itp.',
      'Zabawki / gry',
      'Opieka nad dziećmi',
      'Inne',
    ],
  },
  {
    name: 'Rozrywka',
    type: 'expense',
    children: [
      'Siłownia / Basen',
      'Kino / Teatr',
      'Koncerty',
      'Czasopisma',
      'Książki',
      'Hobby',
      'Hotel / Turystyka',
      'Inne',
    ],
  },
  {
    name: 'Inne wydatki',
    type: 'expense',
    children: [
      'Dobroczynność',
      'Prezenty',
      'Sprzęt RTV',
      'Oprogramowanie',
      'Edukacja / Szkolenia',
      'Usługi inne',
      'Podatki',
      'Inne',
    ],
  },
  {
    name: 'Spłata długów',
    type: 'expense',
    children: [
      'Kredyt hipoteczny',
      'Kredyt konsumpcyjny',
      'Pożyczka osobista',
      'Karta kredytowa 1',
      'Karta kredytowa 2',
      'Inne',
    ],
  },
  {
    name: 'Oszczędności',
    type: 'savings',
    children: [
      'Fundusz awaryjny',
      'Fundusz wydatków nieregularnych',
      'Poduszka finansowa',
      'Konto emerytalne IKE/IKZE',
      'Nadpłata długów',
      'Fundusz: wakacje',
      'Fundusz: prezenty świąteczne',
      'Inne',
    ],
  },
]
