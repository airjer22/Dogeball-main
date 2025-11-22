# Bracket Repair Instructions

## Problem Summary
Your tournament experienced data inconsistency between the bracket display and calendar due to incorrect semifinal match pairings. This has been fixed for future matches, but your current tournament data needs repair.

## What Was Fixed

### 1. **Core Bug Fix** (`app/api/update-bracket-score/[matchId]/route.ts`)
- Fixed the semifinal creation logic to properly pair winners based on which quarterfinal match they won
- Correct pairings now:
  - SF1: Winner of QF1 (1v8) vs Winner of QF2 (4v5)
  - SF2: Winner of QF3 (3v6) vs Winner of QF4 (2v7)

### 2. **Enhanced Scheduling API** (`app/api/schedule-match/route.ts`)
- Added fallback to search for matches in both team orders
- Automatically creates missing Match documents for bracket games
- Better error messages and logging

### 3. **Data Repair Utility** (`app/api/repair-bracket/route.ts`)
- Analyzes existing match history to determine actual winners
- Recreates Match documents with correct pairings
- Cleans up duplicate scheduled matches
- Updates all BracketTeam references

## How to Repair Your Current Tournament

### Method 1: Using Browser Console (Easiest)

1. Open your browser and navigate to your tournament bracket page
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Copy and paste this code, **replacing `YOUR_TOURNAMENT_ID` with your actual tournament ID**:

```javascript
fetch('/api/repair-bracket', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tournamentId: 'YOUR_TOURNAMENT_ID'
  })
})
.then(response => response.json())
.then(data => {
  console.log('Repair Result:', data);
  if (data.success) {
    console.log('✅ Bracket repair completed successfully!');
    console.log('Repair logs:', data.logs);
    // Refresh the page to see the fixed bracket
    window.location.reload();
  } else {
    console.error('❌ Repair failed:', data.message);
  }
})
.catch(error => {
  console.error('❌ Error calling repair API:', error);
});
```

### Method 2: Using curl (Command Line)

```bash
curl -X POST http://localhost:3000/api/repair-bracket \
  -H "Content-Type: application/json" \
  -d '{"tournamentId": "YOUR_TOURNAMENT_ID"}'
```

### Method 3: Using Postman or Similar API Tool

- **URL:** `http://localhost:3000/api/repair-bracket`
- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "tournamentId": "YOUR_TOURNAMENT_ID"
}
```

## Finding Your Tournament ID

1. Go to your tournament bracket page
2. Open Developer Tools (F12) → Console tab
3. Run: `console.log(window.location.search)`
4. Look for the `tournamentId` parameter in the URL

OR

1. Check the URL in your browser address bar
2. The tournament ID is typically in the URL like: `/dashboard/bracket?tournamentId=XXXXX`

## What the Repair Will Do

The repair endpoint will:
1. ✅ Identify all quarterfinal winners from match history
2. ✅ Delete incorrectly paired semifinal/final Match documents
3. ✅ Recreate semifinal Match documents with correct pairings
4. ✅ Update BracketTeam records with correct round/stage/nextMatchId
5. ✅ Clean up any duplicate scheduled matches
6. ✅ Handle finals creation if both semifinals are complete

## After Running Repair

1. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)
2. Check the bracket page - teams should now be correctly paired
3. Check the calendar page - matches should now show correctly
4. You should be able to schedule the second semifinal without issues

## Verification

After repair, verify:
- ✅ Quarterfinal results are still correct
- ✅ Semifinal pairings are correct
- ✅ Teams are in the right stage/round
- ✅ You can schedule remaining matches
- ✅ Calendar shows all matches correctly

## Future Tournaments

All future tournaments will automatically use the corrected logic. You only need to run the repair utility once for your current corrupted tournament.

## Troubleshooting

**If the repair fails:**
1. Check the console for detailed error messages
2. Verify your tournament ID is correct
3. Ensure the development server is running
4. Check that you have database connectivity

**If the bracket still looks wrong:**
1. Clear your browser cache
2. Hard refresh (Ctrl+F5)
3. Check browser console for JavaScript errors

## Need Help?

If you encounter issues:
1. Check the server logs for detailed error information
2. The repair endpoint returns detailed logs of all actions taken
3. You can run the repair multiple times safely - it will always use matchHistory as the source of truth
