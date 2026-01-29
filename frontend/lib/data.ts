export type EventType = "concert" | "general";

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  image: string;
  price: number;
  originalPrice?: number;
  category: string;
  type: EventType;
  availableTickets: number;
  totalTickets: number;
  artists?: string[];
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  price: number;
  status: "available" | "selected" | "sold";
  section: string;
}

export const events: Event[] = [
  {
    id: "1",
    title: "Taylor Swift - Eras Tour",
    description:
      "Experience the magic of Taylor Swift's record-breaking Eras Tour. A journey through all her musical eras with stunning visuals and unforgettable performances.",
    date: "2026-03-15",
    time: "19:00",
    venue: "Madison Square Garden",
    city: "New York",
    image: "/images/concert-1.jpg",
    price: 150,
    originalPrice: 200,
    category: "Music",
    type: "concert",
    availableTickets: 245,
    totalTickets: 20000,
    artists: ["Taylor Swift"],
  },
  {
    id: "2",
    title: "Tech Conference 2026",
    description:
      "Join thousands of developers, designers, and entrepreneurs for the biggest tech conference of the year. Keynotes, workshops, and networking opportunities.",
    date: "2026-04-20",
    time: "09:00",
    venue: "Moscone Center",
    city: "San Francisco",
    image: "/images/tech-conf.jpg",
    price: 350,
    category: "Conference",
    type: "general",
    availableTickets: 1200,
    totalTickets: 5000,
  },
  {
    id: "3",
    title: "Coldplay - Music of the Spheres",
    description:
      "Coldplay brings their spectacular Music of the Spheres World Tour with sustainable concert production and immersive light shows.",
    date: "2026-05-10",
    time: "20:00",
    venue: "Wembley Stadium",
    city: "London",
    image: "/images/concert-2.jpg",
    price: 120,
    originalPrice: 150,
    category: "Music",
    type: "concert",
    availableTickets: 890,
    totalTickets: 90000,
    artists: ["Coldplay"],
  },
  {
    id: "4",
    title: "Food & Wine Festival",
    description:
      "Taste your way through hundreds of food and wine offerings from top chefs and wineries around the world.",
    date: "2026-06-05",
    time: "11:00",
    venue: "Central Park",
    city: "New York",
    image: "/images/food-fest.jpg",
    price: 85,
    category: "Food & Drink",
    type: "general",
    availableTickets: 3500,
    totalTickets: 10000,
  },
  {
    id: "5",
    title: "Ed Sheeran - Mathematics Tour",
    description:
      "Ed Sheeran returns with his Mathematics Tour, performing all your favorite hits in an intimate stadium setting.",
    date: "2026-07-22",
    time: "19:30",
    venue: "SoFi Stadium",
    city: "Los Angeles",
    image: "/images/concert-3.jpg",
    price: 95,
    category: "Music",
    type: "concert",
    availableTickets: 1500,
    totalTickets: 70000,
    artists: ["Ed Sheeran"],
  },
  {
    id: "6",
    title: "Comic-Con International",
    description:
      "The ultimate celebration of pop culture featuring panels, exhibits, and exclusive previews from movies, TV, and comics.",
    date: "2026-07-25",
    time: "10:00",
    venue: "San Diego Convention Center",
    city: "San Diego",
    image: "/images/comic-con.jpg",
    price: 250,
    category: "Entertainment",
    type: "general",
    availableTickets: 800,
    totalTickets: 130000,
  },
  {
    id: "7",
    title: "The Weeknd - After Hours Tour",
    description:
      "Experience The Weeknd's cinematic live performance with stunning visuals and his biggest hits.",
    date: "2026-08-14",
    time: "21:00",
    venue: "United Center",
    city: "Chicago",
    image: "/images/concert-4.jpg",
    price: 135,
    originalPrice: 175,
    category: "Music",
    type: "concert",
    availableTickets: 650,
    totalTickets: 23000,
    artists: ["The Weeknd"],
  },
  {
    id: "8",
    title: "Art Basel Miami",
    description:
      "The premier art show of the Americas featuring leading galleries from North America, Latin America, Europe, and beyond.",
    date: "2026-12-03",
    time: "11:00",
    venue: "Miami Beach Convention Center",
    city: "Miami",
    image: "/images/art-basel.jpg",
    price: 75,
    category: "Art",
    type: "general",
    availableTickets: 4200,
    totalTickets: 80000,
  },
  {
    id: "9",
    title: "BTS - World Tour",
    description:
      "The global phenomenon BTS brings their electrifying performance with choreography and fan interactions.",
    date: "2026-09-18",
    time: "19:00",
    venue: "Rose Bowl Stadium",
    city: "Los Angeles",
    image: "/images/concert-5.jpg",
    price: 200,
    originalPrice: 280,
    category: "Music",
    type: "concert",
    availableTickets: 120,
    totalTickets: 90000,
    artists: ["BTS"],
  },
  {
    id: "10",
    title: "Marathon City Run",
    description:
      "Join thousands of runners in the annual city marathon through scenic urban routes.",
    date: "2026-10-12",
    time: "06:00",
    venue: "Downtown",
    city: "Boston",
    image: "/images/marathon.jpg",
    price: 50,
    category: "Sports",
    type: "general",
    availableTickets: 15000,
    totalTickets: 30000,
  },
  {
    id: "11",
    title: "Billie Eilish - Happier Than Ever",
    description:
      "Billie Eilish brings her unique sound and aesthetic to the stage in this immersive concert experience.",
    date: "2026-11-05",
    time: "20:00",
    venue: "The O2 Arena",
    city: "London",
    image: "/images/concert-6.jpg",
    price: 110,
    category: "Music",
    type: "concert",
    availableTickets: 2100,
    totalTickets: 20000,
    artists: ["Billie Eilish"],
  },
  {
    id: "12",
    title: "Startup Summit 2026",
    description:
      "Connect with investors, founders, and industry leaders at the premier startup event of the year.",
    date: "2026-11-20",
    time: "08:00",
    venue: "Javits Center",
    city: "New York",
    image: "/images/startup-summit.jpg",
    price: 450,
    category: "Business",
    type: "general",
    availableTickets: 600,
    totalTickets: 3000,
  },
];

export const categories = [
  "All",
  "Music",
  "Conference",
  "Food & Drink",
  "Entertainment",
  "Art",
  "Sports",
  "Business",
];

export const cities = [
  "All Cities",
  "New York",
  "San Francisco",
  "London",
  "Los Angeles",
  "San Diego",
  "Chicago",
  "Miami",
  "Boston",
];

export function generateSeats(eventId: string): Seat[] {
  const sections = ["VIP", "A", "B", "C", "D"];
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const seats: Seat[] = [];

  const sectionPrices: Record<string, number> = {
    VIP: 350,
    A: 200,
    B: 150,
    C: 120,
    D: 80,
  };

  sections.forEach((section) => {
    rows.forEach((row) => {
      const seatsInRow = section === "VIP" ? 10 : 15;
      for (let i = 1; i <= seatsInRow; i++) {
        const random = Math.random();
        seats.push({
          id: `${eventId}-${section}-${row}-${i}`,
          row,
          number: i,
          price: sectionPrices[section],
          status: random < 0.3 ? "sold" : "available",
          section,
        });
      }
    });
  });

  return seats;
}

export function getEventById(id: string): Event | undefined {
  return events.find((event) => event.id === id);
}

export function filterEvents(
  category: string,
  city: string,
  type: string,
  search: string
): Event[] {
  return events.filter((event) => {
    const matchesCategory = category === "All" || event.category === category;
    const matchesCity = city === "All Cities" || event.city === city;
    const matchesType = type === "all" || event.type === type;
    const matchesSearch =
      search === "" ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.venue.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesCity && matchesType && matchesSearch;
  });
}
