import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

const seedDatabase = async (): Promise<void> => {
  try {
    console.log('🌱 Starting database seeding...');

    // Seed admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.execute(
      `INSERT IGNORE INTO users (name, email, password, role, is_verified) 
       VALUES (?, ?, ?, ?, ?)`,
      ['Admin', 'admin@persiraja.com', adminPassword, 'admin', true]
    );

    // Seed categories
    const categories = [
      ['Berita Tim', 'Berita terkait tim dan manajemen'],
      ['Pertandingan', 'Berita seputar pertandingan'],
      ['Pemain', 'Berita tentang pemain'],
      ['Pengumuman', 'Pengumuman resmi klub']
    ];

    for (const category of categories) {
      await pool.execute(
        'INSERT IGNORE INTO categories (name, description) VALUES (?, ?)',
        category
      );
    }

    // Seed players
    const players = [
      ['Muhammad Ridho', 1, 'Goalkeeper', 25, 1.82, 75],
      ['Andi Irawan', 2, 'Right-Back', 27, 1.75, 70],
      ['Rizky Pratama', 3, 'Centre-Back', 28, 1.85, 78],
      ['Ahmad Fauzi', 4, 'Centre-Back', 26, 1.83, 76],
      ['Dedi Kusnandar', 5, 'Left-Back', 24, 1.77, 72],
      ['Wahyu Sukarta', 6, 'Defensive Midfielder', 29, 1.78, 74],
      ['Riko Simanjuntak', 7, 'Attacking Midfielder', 25, 1.73, 68],
      ['Sandi Sute', 8, 'Central Midfielder', 27, 1.76, 71],
      ['Patrich Wanma', 9, 'Striker', 26, 1.79, 73],
      ['Eky Taufik', 10, 'Forward', 24, 1.74, 69],
      ['Firman Ramadhan', 11, 'Winger', 23, 1.72, 67]
    ];

    for (const player of players) {
      await pool.execute(
        `INSERT IGNORE INTO players (name, jersey_number, position, age, height, weight) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        player
      );
    }

    // Seed sample match
    await pool.execute(
      `INSERT IGNORE INTO matches (
        home_team, away_team, match_date, venue, competition,
        ticket_price_vip, ticket_price_tribune, ticket_price_economy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Persiraja Banda Aceh',
        'PSMS Medan',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        'Stadion Harapan Bangsa',
        'Liga 2 Indonesia',
        250000,
        150000,
        75000
      ]
    );

    // Seed sample news
    const [adminUser] = await pool.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    const adminId = (adminUser as any[])[0]?.id;

    if (adminId) {
      await pool.execute(
        `INSERT IGNORE INTO news (
          title, slug, content, excerpt, author_id, status, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'Persiraja Siap Menghadapi Musim Baru Liga 2',
          'persiraja-siap-menghadapi-musim-baru-liga-2',
          'Persiraja Banda Aceh telah menyelesaikan persiapan untuk menghadapi musim baru Liga 2 Indonesia. Tim yang dijuluki Laskar Rencong ini telah melakukan berbagai persiapan matang mulai dari perekrutan pemain baru, latihan intensif, hingga uji coba dengan tim-tim tangguh lainnya.',
          'Persiraja Banda Aceh siap menghadapi tantangan di musim baru Liga 2 dengan persiapan yang matang.',
          adminId,
          'published',
          new Date()
        ]
      );
    }

    // Seed settings
    const settings = [
      ['club_name', 'Persiraja Banda Aceh', 'Nama resmi klub'],
      ['club_founded', '1947', 'Tahun berdiri klub'],
      ['stadium_name', 'Stadion Harapan Bangsa', 'Nama stadion kandang'],
      ['stadium_capacity', '45000', 'Kapasitas stadion'],
      ['contact_email', 'info@persiraja.com', 'Email kontak resmi'],
      ['contact_phone', '+62-651-123456', 'Nomor telepon kontak']
    ];

    for (const setting of settings) {
      await pool.execute(
        'INSERT IGNORE INTO settings (key_name, value, description) VALUES (?, ?, ?)',
        setting
      );
    }

    console.log('✅ Database seeding completed successfully');
    
    // Display seeded data summary
    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [playerCount] = await pool.execute('SELECT COUNT(*) as count FROM players');
    const [matchCount] = await pool.execute('SELECT COUNT(*) as count FROM matches');
    const [newsCount] = await pool.execute('SELECT COUNT(*) as count FROM news');
    
    console.log(`
📊 Seeding Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Users: ${(userCount as any[])[0].count}
⚽ Players: ${(playerCount as any[])[0].count}
🏟️  Matches: ${(matchCount as any[])[0].count}
📰 News: ${(newsCount as any[])[0].count}
━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 All seeding operations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding error:', error);
      process.exit(1);
    });
}

export { seedDatabase };