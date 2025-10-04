const mongoose = require('mongoose');

async function migrateMatchScores() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('MONGODB_URI environment variable is not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const scheduledMatchesCollection = db.collection('scheduledmatches');

    const matchesWithOldScores = await scheduledMatchesCollection.find({
      scores: { $exists: true }
    }).toArray();

    console.log(`Found ${matchesWithOldScores.length} matches with old score format`);

    if (matchesWithOldScores.length === 0) {
      console.log('No matches need migration');
      await mongoose.connection.close();
      return;
    }

    for (const match of matchesWithOldScores) {
      const updateData = {
        homeScore: match.scores?.homeScore || 0,
        awayScore: match.scores?.awayScore || 0,
        homePins: match.scores?.homePins || 0,
        awayPins: match.scores?.awayPins || 0
      };

      await scheduledMatchesCollection.updateOne(
        { _id: match._id },
        {
          $set: updateData,
          $unset: { scores: "" }
        }
      );

      console.log(`Migrated match ${match._id}: ${updateData.homeScore}-${updateData.awayScore}`);
    }

    console.log(`Successfully migrated ${matchesWithOldScores.length} matches`);
    await mongoose.connection.close();
    console.log('Migration complete');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateMatchScores();
