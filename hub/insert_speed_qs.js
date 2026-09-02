import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://fbgtqcogaykvdtysqmsz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZ3RxY29nYXlrdmR0eXNxbXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODU1MTgsImV4cCI6MjEwMzY2MTUxOH0.QiuLfAzfmEHIiwFKwy2b6IdAkqob9jD38UbCy1GxaLc'
const supabase = createClient(supabaseUrl, supabaseKey)

const questions = [
  {
    text: "This team's papaya-orange & blue livery lit up the grid. Which team is it?",
    type: "mcq",
    options: ["Alpine", "McLaren", "Williams", "Haas"],
    correct_answer: "McLaren",
    max_points: 35,
    time_allotted: 90,
    sort_order: 1
  },
  {
    text: "Navy blue with red & yellow bull accents. Which team is it?",
    type: "mcq",
    options: ["Visa Cash App RB", "Oracle Red Bull Racing", "Williams", "Sauber"],
    correct_answer: "Oracle Red Bull Racing",
    max_points: 35,
    time_allotted: 90,
    sort_order: 2
  },
  {
    text: "British Racing Green with a lime-yellow accent stripe. Which team is it?",
    type: "mcq",
    options: ["Aston Martin Aramco", "Mercedes", "Alpine", "Haas"],
    correct_answer: "Aston Martin Aramco",
    max_points: 50,
    time_allotted: 90,
    sort_order: 3
  },
  {
    text: "Rosso Corsa red with yellow accents. Which team is it?",
    type: "mcq",
    options: ["Alfa Romeo", "Scuderia Ferrari", "Toro Rosso", "Haas"],
    correct_answer: "Scuderia Ferrari",
    max_points: 35,
    time_allotted: 90,
    sort_order: 4
  },
  {
    text: "Silver-black with Petronas teal-green stripes. Which team is it?",
    type: "mcq",
    options: ["Williams", "Aston Martin", "Mercedes-AMG Petronas", "McLaren"],
    correct_answer: "Mercedes-AMG Petronas",
    max_points: 50,
    time_allotted: 90,
    sort_order: 5
  },
  {
    text: "DRS may be activated by the driver:",
    type: "mcq",
    options: ["Anywhere on the track", "Only in designated DRS zones, within 1 sec of the car ahead", "Only on the main straight", "Only during qualifying"],
    correct_answer: "Only in designated DRS zones, within 1 sec of the car ahead",
    max_points: 35,
    time_allotted: 90,
    sort_order: 6
  },
  {
    text: "Which braking-assist technology is banned on MotoGP bikes, unlike on most road-going motorcycles?",
    type: "mcq",
    options: ["ABS", "Traction control", "Engine braking", "Launch control"],
    correct_answer: "ABS",
    max_points: 50,
    time_allotted: 90,
    sort_order: 7
  },
  {
    text: "How many laps make up the Monaco Grand Prix?",
    type: "mcq",
    options: ["58", "66", "78", "87"],
    correct_answer: "78",
    max_points: 50,
    time_allotted: 90,
    sort_order: 8
  },
  {
    text: "In which year was the first-ever Formula 1 World Championship season held?",
    type: "mcq",
    options: ["1946", "1950", "1955", "1961"],
    correct_answer: "1950",
    max_points: 35,
    time_allotted: 90,
    sort_order: 9
  },
  {
    text: "Monza earned a famous nickname because of its blistering average lap speeds. What is it called?",
    type: "mcq",
    options: ["The Temple of Speed", "The Green Hell", "The Cathedral of Curves", "The Silverstone of Italy"],
    correct_answer: "The Temple of Speed",
    max_points: 50,
    time_allotted: 90,
    sort_order: 10
  }
]

async function run() {
  console.log("Clearing existing questions...")
  await supabase.from('questions').delete().neq('id', -1) // Deletes all
  
  console.log("Inserting Speed Round questions...")
  const { data, error } = await supabase.from('questions').insert(questions)
  
  if (error) {
    console.error("Error:", error)
  } else {
    console.log("Successfully inserted 10 questions.")
  }
}

run()
