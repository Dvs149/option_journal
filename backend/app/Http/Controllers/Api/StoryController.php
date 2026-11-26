<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Story;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class StoryController extends Controller
{
    /**
     * Display a listing of stories for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Story::forUser($user->id);

        // Filter by category
        if ($request->filled('category') && $request->category !== 'all') {
            $query->category($request->category);
        }

        // Filter by series name
        if ($request->filled('series_name') && $request->series_name !== 'all') {
            $query->series($request->series_name);
        }

        // Filter by series type (series_only / standalone_only)
        if ($request->filled('series_filter') && $request->series_filter !== 'all') {
            $query->seriesFilter($request->series_filter);
        }

        // Filter by reading status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->status($request->status);
        }

        // Filter by favorites
        if ($request->boolean('is_favorite')) {
            $query->favorites();
        }

        // Search in title, author, category, summary, series_name
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Sorting
        $sortBy = $request->get('sort_by');
        $sortOrder = strtolower($request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        // When a specific series is selected and no explicit sort specified, order parts sequentially (1, 2, 3...)
        if (empty($sortBy) && $request->filled('series_name') && $request->series_name !== 'all') {
            $query->orderBy('part_number', 'asc')->orderBy('id', 'asc');
        } else {
            $sortBy = $sortBy ?: 'created_at';
            $allowedSorts = ['created_at', 'title', 'word_count', 'estimated_reading_time', 'last_read_at', 'reading_progress', 'part_number', 'series_name'];
            if (in_array($sortBy, $allowedSorts)) {
                $query->orderBy($sortBy, $sortOrder);
            } else {
                $query->latest();
            }
        }

        $perPage = max(1, min((int) $request->get('per_page', 12), 100));
        $stories = $query->paginate($perPage);

        // Overall stats for authenticated user
        $baseQuery = Story::forUser($user->id);
        $totalStories = (clone $baseQuery)->count();
        $totalWords = (clone $baseQuery)->sum('word_count');
        $completedCount = (clone $baseQuery)->where('status', 'completed')->count();
        $readingCount = (clone $baseQuery)->where('status', 'reading')->count();
        $favoritesCount = (clone $baseQuery)->where('is_favorite', true)->count();
        $categories = (clone $baseQuery)->select('category')
            ->distinct()
            ->whereNotNull('category')
            ->pluck('category')
            ->values();

        $seriesList = (clone $baseQuery)->whereNotNull('series_name')
            ->where('series_name', '!=', '')
            ->distinct()
            ->pluck('series_name')
            ->values();
        $seriesCount = $seriesList->count();

        return response()->json([
            'status' => 'success',
            'data' => $stories->items(),
            'current_page' => $stories->currentPage(),
            'last_page' => $stories->lastPage(),
            'per_page' => $stories->perPage(),
            'total' => $stories->total(),
            'stats' => [
                'total_stories' => $totalStories,
                'total_words' => (int) $totalWords,
                'completed_count' => $completedCount,
                'reading_count' => $readingCount,
                'favorites_count' => $favoritesCount,
                'categories' => $categories,
                'series_count' => $seriesCount,
                'series_list' => $seriesList,
            ],
        ]);
    }

    /**
     * Store a newly created story in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'author' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:50'],
            'series_name' => ['nullable', 'string', 'max:255'],
            'part_number' => ['nullable', 'integer', 'min:1'],
            'part_title' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'content' => ['required', 'string'],
            'cover_color' => ['nullable', 'string', 'max:30'],
            'tags' => ['nullable'],
            'status' => ['nullable', 'string', 'in:unread,reading,completed'],
            'is_favorite' => ['nullable', 'boolean'],
            'parent_story_id' => ['nullable', 'integer'],
        ]);

        $tags = $this->normalizeTags($validated['tags'] ?? null);

        // If parent_story_id is provided and the parent story does not have a series_name yet,
        // automatically assign the parent story to this series as Part 1!
        if (!empty($validated['parent_story_id']) && !empty($validated['series_name'])) {
            $parent = Story::forUser($request->user()->id)->find($validated['parent_story_id']);
            if ($parent && empty($parent->series_name)) {
                $parent->update([
                    'series_name' => trim($validated['series_name']),
                    'part_number' => 1,
                ]);
            }
        }

        // Auto-assign next part_number if series_name is given without an explicit part_number
        $partNumber = $validated['part_number'] ?? null;
        if (!empty($validated['series_name']) && empty($partNumber)) {
            $maxPart = Story::forUser($request->user()->id)
                ->where('series_name', trim($validated['series_name']))
                ->max('part_number');
            $partNumber = $maxPart ? ($maxPart + 1) : 1;
        }

        $story = Story::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'author' => $validated['author'] ?? 'Anonymous',
            'category' => !empty($validated['category']) ? $validated['category'] : 'General',
            'series_name' => !empty($validated['series_name']) ? trim($validated['series_name']) : null,
            'part_number' => $partNumber,
            'part_title' => $validated['part_title'] ?? null,
            'summary' => $validated['summary'] ?? null,
            'content' => $validated['content'],
            'cover_color' => $validated['cover_color'] ?? '#3b82f6',
            'tags' => $tags,
            'status' => $validated['status'] ?? 'unread',
            'is_favorite' => (bool) ($validated['is_favorite'] ?? false),
        ]);

        $storyData = $story->toArray();
        $storyData['sibling_parts'] = $story->getSiblingParts();

        return response()->json([
            'status' => 'success',
            'message' => 'Story saved successfully',
            'data' => $storyData,
        ], 201);
    }

    /**
     * Display the specified story.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $story = Story::forUser($request->user()->id)->findOrFail($id);

        // Update last read timestamp and mark as reading if it was unread
        $updates = ['last_read_at' => Carbon::now()];
        if ($story->status === 'unread') {
            $updates['status'] = 'reading';
        }
        $story->update($updates);

        $storyData = $story->toArray();
        $storyData['sibling_parts'] = $story->getSiblingParts();

        return response()->json([
            'status' => 'success',
            'data' => $storyData,
        ]);
    }

    /**
     * Update the specified story in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $story = Story::forUser($request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'author' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:50'],
            'series_name' => ['nullable', 'string', 'max:255'],
            'part_number' => ['nullable', 'integer', 'min:1'],
            'part_title' => ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string', 'max:1000'],
            'content' => ['sometimes', 'required', 'string'],
            'cover_color' => ['nullable', 'string', 'max:30'],
            'tags' => ['nullable'],
            'status' => ['nullable', 'string', 'in:unread,reading,completed'],
            'is_favorite' => ['nullable', 'boolean'],
            'reading_progress' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        if (array_key_exists('tags', $validated)) {
            $validated['tags'] = $this->normalizeTags($validated['tags']);
        }

        if (array_key_exists('series_name', $validated)) {
            $validated['series_name'] = !empty($validated['series_name']) ? trim($validated['series_name']) : null;
        }

        $story->update($validated);

        $fresh = $story->fresh();
        $storyData = $fresh->toArray();
        $storyData['sibling_parts'] = $fresh->getSiblingParts();

        return response()->json([
            'status' => 'success',
            'message' => 'Story updated successfully',
            'data' => $storyData,
        ]);
    }

    /**
     * Remove the specified story from storage.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $story = Story::forUser($request->user()->id)->findOrFail($id);
        $story->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Story deleted successfully',
        ]);
    }

    /**
     * Toggle favorite state for a story.
     */
    public function toggleFavorite(Request $request, int $id): JsonResponse
    {
        $story = Story::forUser($request->user()->id)->findOrFail($id);
        $story->update(['is_favorite' => !$story->is_favorite]);

        return response()->json([
            'status' => 'success',
            'message' => $story->is_favorite ? 'Added to favorites' : 'Removed from favorites',
            'data' => $story,
        ]);
    }

    /**
     * Update reading progress (percentage and paragraph position).
     */
    public function updateProgress(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'progress' => ['required', 'integer', 'min:0', 'max:100'],
            'paragraph_index' => ['nullable', 'integer', 'min:0'],
            'last_read_paragraph' => ['nullable', 'integer', 'min:0'],
        ]);

        $story = Story::forUser($request->user()->id)->findOrFail($id);

        $progress = $validated['progress'];
        $updates = [
            'reading_progress' => $progress,
            'last_read_at' => Carbon::now(),
        ];

        $paragraphIndex = $validated['paragraph_index'] ?? ($validated['last_read_paragraph'] ?? null);
        if ($paragraphIndex !== null) {
            $updates['last_read_paragraph'] = $paragraphIndex;
        }

        if ($progress >= 95) {
            $updates['status'] = 'completed';
        } elseif ($progress > 0 && $story->status === 'unread') {
            $updates['status'] = 'reading';
        }

        $story->update($updates);

        return response()->json([
            'status' => 'success',
            'message' => 'Reading progress updated',
            'data' => $story,
        ]);
    }

    /**
     * Seed sample free-time stories for the user.
     */
    public function seedSamples(Request $request): JsonResponse
    {
        $user = $request->user();

        $samples = [
            [
                'title' => 'The Archer and the Unshakable Target',
                'author' => 'Ancient Eastern Parable',
                'category' => 'Philosophy & Wisdom',
                'summary' => 'A master archer teaches an eager apprentice that true accuracy does not come from watching the bullseye, but from quiet stillness within one\'s own breath.',
                'cover_color' => '#10b981',
                'tags' => ['patience', 'focus', 'mindset', 'mastery'],
                'content' => <<<EOT
In a quiet monastery nestled between mist-covered peaks, there lived an archer named Kaelen. His arrows never missed their mark. Whether against the whistling mountain gale or in pitch darkness guided solely by the rustle of leaves, Kaelen's bowstring released with effortless certainty.

One morning, a young traveler arrived at the temple gates. The traveler carried a finely crafted recurve bow of polished ash wood, strung with silk. "Master," the traveler said, bowing deeply. "I have trained for ten years under the finest marksmen of the capital. I can split a suspended willow leaf from fifty paces when the wind is dead calm. Yet in the heat of competition, when the drums pound and the crowd watches, my hands tremble, my vision narrows, and my arrows fly wild. How do I conquer the target?"

Kaelen smiled gently and laid aside his broom. "You do not conquer the target, young friend. You conquer yourself. Come with me."

The master led the youth high into the craggy cliffs above the monastery, stopping at a narrow precipice where a slender cedar log stretched across a chasm several hundred feet deep. Far below, white water churned fiercely over jagged stones.

Kaelen stepped out onto the center of the log with the light grace of a mountain goat. He drew an arrow from his quiver, notched it, raised his weathered longbow, and pointed it toward a small red ribbon fluttering on a pine tree across the gorge. With a smooth exhalation, he released. The arrow hissed through the wind and pinned the center of the ribbon to the trunk.

Stepping back onto the solid rock ledge, Kaelen gestured toward the log. "Now, show me your skill."

The youth approached the log. But as he looked down into the roaring abyss, his knees turned to water. His heart hammered in his chest like a frantic bird against iron bars. He stepped one trembling foot onto the log, raised his bow, and notched an arrow. His fingers shook so violently that the arrow slipped and clattered into the canyon below. Gasping, the youth dropped to his hands and knees and crawled backward onto solid ground, drenched in cold sweat.

"I cannot do it!" the youth cried in shame. "My technique is flawless on level ground, yet here I cannot even hold the string!"

Kaelen helped the young man to his feet and handed him a flask of spring water.

"Your technique is indeed refined," Kaelen said softly. "On level ground, your mind thinks only of the bow and the arrow. But on the edge of the chasm, your mind thinks of falling. You think of danger. You think of failure. You think of what others will say if you fall."

Kaelen tapped the young man's chest. "The target you see across the chasm is not your adversary. The chasm is not your adversary. The bow in your hands is only wood and cord. The only contest taking place in this universe is between your present breath and your fearful imagination. When you shoot on flat ground, the world is quiet inside you. When you shoot on the precipice, you let the outside noise invade your quiet center."

"How do I silence the chasm, Master?" the youth asked.

"You do not silence the chasm," Kaelen replied. "The chasm has roared for ten thousand winters, and it will roar for ten thousand more. You merely realize that you are not the chasm. You are the stillness that observes it. When you draw the bow, let your awareness rest wholly in the feeling of the string against your fingers. Let the breath settle deep into your belly. Do not rush to see where the arrow will strike, for the strike has already happened the moment your mind is clear."

The youth spent three seasons at the monastery. He did not touch his bow for the first month. He hauled water, chopped firewood, and sat at dawn listening to the wind until the roaring in his ears became as familiar and gentle as a mother's lullaby.

When he finally returned to the precipice on the eve of autumn, the chasm below was just as deep, the rocks just as sharp, and the river just as fierce. But when he stepped onto the log, his footing was steady. He breathed in the cool mountain pine, smiled at the ribbon across the void, and let fly.
EOT
            ],
            [
                'title' => 'The Whispering Ledger of Amsterdam',
                'author' => 'Historical Fiction',
                'category' => 'History & Commerce',
                'summary' => 'In 1636 Amsterdam, a meticulous spice merchant records transactions in a leather-bound journal, discovering that the greatest fortunes are preserved not by chasing the crowd, but by knowing when to walk away.',
                'cover_color' => '#8b5cf6',
                'tags' => ['history', 'tulips', 'amsterdam', 'discipline', 'markets'],
                'content' => <<<EOT
The rain over Amsterdam in the winter of 1636 had the chill of iron. In the corner tavern along the Singel canal, smoke from clay pipes hung thick beneath low oak rafters. Men spoke in frantic, breathless whispers. Prices were being written on chalkboards and wiped clean within the hour, only to be rewritten higher.

A single bulb of the *Semper Augustus*—with its flame-like crimson streaks cutting through ivory petals—had just traded hands for four thousand guilders, along with a carriage, two gray horses, and twelve acres of farmland.

Pieter van Houten sat at a small candlelit table in the back of the tavern. He was forty-two years old, with ink-stained fingertips and spectacles perched on a sharp nose. Before him lay an unblemished leather ledger bound in calfskin. While others waved banknotes and promissory slips in the center of the tavern, Pieter dipped his goose quill into black walnut ink and recorded three simple numbers:

*Opening balance. Risk taken. Price paid.*

Pieter was not a speculator; he was a merchant of nutmeg and clove who had traded with the Dutch East India Company since his youth. He understood the slow, dangerous journey of wooden caravels navigating the Cape of Good Hope, the unpredictable storms, the scurvy, and the reality that true wealth was forged through patience and arithmetic.

A young associate, Hendrick, rushed over to Pieter's table, his cheeks flushed with tavern ale and excitement.

"Pieter! You are sitting here scratching in that dry book while the entire world is becoming rich before your eyes!" Hendrick slammed a parchment slip onto the table. "I bought six contracts for the *Viceroy* this morning. The courier from Haarlem says the price has already climbed twenty percent since noon! If I sell on Friday, I will buy a townhome on the Herengracht!"

Pieter looked at the paper, then looked into the young man's wide, bloodshot eyes.

"And who will buy it from you on Friday, Hendrick?" Pieter asked quietly.

"Anyone! Everyone!" Hendrick laughed, waving his arm toward the noisy room. "The weavers are selling their looms. The bakers are pawning their ovens. Even the chimney sweeps are buying fractions of bulbs. There is no top, Pieter. Everyone agrees that the demand across Paris and Vienna will never cease!"

Pieter turned the page of his ledger. He showed Hendrick an entry from twelve years earlier, when a speculative fever in Baltic rye had swept through the exchange.

"Look closely, Hendrick," Pieter murmured. "Do you see this column? It is the column of exit. When an asset's price is driven not by its utility, its fragrance, or its nourishment, but solely by the hope that someone tomorrow will be more foolish than the man today, it is not an investment. It is a game of musical chairs played on thin ice."

"You are too cautious, old man," Hendrick muttered defensively, snatching his parchment slip. "Fortune favors the bold."

"Fortune favors those who survive," Pieter replied with a gentle nod.

Pieter closed his ledger, blew out his tallow candle, and walked home through the damp cobblestone streets. He did not buy a single bulb. When the madness reached its fever pitch in January 1637, with tavern auctions running through the night, Pieter quietly settled his debts, reinforced his warehouse inventory of durable spices, and held cash reserves in the Bank of Amsterdam.

On the first Tuesday of February 1637, at a routine auction in Haarlem, an auctioneer called out a bid for a lot of blooming bulbs.

Silence answered.

He lowered the price by ten guilders. Silence again. He lowered it by fifty. A murmur rippled through the hall, and within thirty minutes, the murmur turned into a panic that swept through the provinces like wildfire. By sunset, buyers refused to honor contracts, sellers were left holding paper promises, and the courts of Holland declared the debts unenforceable.

A week later, Hendrick came to Pieter's quiet warehouse. The youth's proud demeanor was gone; his coat was frayed at the cuffs, and he sat upon a crate of cinnamon, his head buried in his hands.

"I am ruined," Hendrick whispered. "Everything I saved since childhood is vanished into air."

Pieter poured two cups of warm herbal tea. He did not gloat; there was no satisfaction in another man's misfortune. Instead, he pulled a clean, empty journal from his shelf and handed it to Hendrick along with a newly cut quill.

"You are not ruined, Hendrick," Pieter said firmly. "You have merely paid the highest tuition in the world for a lesson that cannot be taught with words. Take this book. From this day forward, write every decision before you make it. Record your reasons, your fears, and your boundaries. When you know why you enter and where you will leave, no market frenzy can ever blow you off course again."

Hendrick opened the first blank page, dipped the quill, and wrote his first true words of wisdom.
EOT
            ],
            [
                'title' => 'The Stargazer\'s Apprentice',
                'author' => 'Sci-Fi / Solarpunk',
                'category' => 'Sci-Fi & Wonder',
                'summary' => 'Stationed on an orbital solar observatory above the ringed moon of Enceladus, a junior engineer learns that beauty is not an interruption to duty, but its ultimate purpose.',
                'cover_color' => '#0ea5e9',
                'tags' => ['scifi', 'space', 'saturn', 'wonder', 'stars'],
                'content' => <<<EOT
The station had no windows facing the reactor core, but it had one massive panoramic cupola that looked out toward the southern geysers of Enceladus.

Maya was twenty-four, clad in the silver thermal jumpsuit of the Outer Planets Habitat Authority. Her shift was eight hours of telemetry verification: checking cryo-coolant pressures, monitoring quantum repeater relays, and making sure the magnetic sails remained aligned within three hundredths of an arcsecond.

Her senior supervisor, Dr. Aris Thorne, was an elderly veteran of the Jovian shipyards. He had spent forty years in low-gravity habitats, and his hair was as white as the crystalline ice rings of Saturn hovering silently above them.

Every evening at precisely 19:00 station time, Dr. Thorne would put down his diagnostic slate, walk to the observation cupola, and sit on the curved bench for exactly twenty minutes without saying a word.

On Maya's third week, a minor coolant alarm chimed on array four just as Thorne began walking toward the cupola. Maya immediately sprang from her station to intercept him.

"Dr. Thorne, array four has a pressure variance of 1.4 percent. I'm preparing an automated scrub routine, but we should run the diagnostic together right now."

Thorne stopped, smiled warmly, and gestured toward the cupola. "Is the backup loop engaged, Maya?"

"Well... yes, secondary coolant is circulating normally within safety thresholds, but standard protocol—"

"Standard protocol says secondary safety systems exist precisely so human beings can breathe," Thorne interrupted gently. "Sit with me for ten minutes."

"Dr. Thorne, with all respect, telemetry is our job. Looking out the window doesn't keep the station in orbit."

"Doesn't it?" Thorne asked.

Reluctantly, Maya followed him into the darkened cupola. As her eyes adjusted, her breath caught in her throat.

Directly below them, the moon Enceladus was emerging from Saturn's vast, indigo shadow. Huge plumes of vapor and water ice—illuminated by the amber sunlight bouncing off Saturn's B-ring—were erupting hundreds of kilometers into the vacuum, glistening like powdered diamonds against the deep velvet black of the abyss. The rings stretched across the entire curved ceiling of the station, an infinite highway of shimmering silver dust and pale gold ice chunks, spinning in silent celestial harmony.

For ten minutes, neither of them spoke. The low hum of the station's life support faded into background texture. The sense of hurry that had pressed against Maya's temples all day dissolved.

"When I was your age," Thorne finally spoke, his voice quiet against the hum of the glass, "I believed that efficiency was the highest virtue a human could possess. I logged twelve-hour shifts, memorized valve serial numbers, and treated every moment spent looking up as a failure of discipline."

He looked at the diamond geysers below.

"Then one day, an old friend told me: 'If all you do is maintain the machine, you forget why the machine was built in the first place.' We didn't cross six hundred million kilometers of vacuum just to monitor valves, Maya. We came out here to see. To witness. To remember that the universe is ancient, vast, and astonishingly beautiful."

Thorne stood up and stretched his arms. "Now that our minds are clean and our hearts are steady, let us go fix array four. You will find that your hands work with far greater precision when your spirit is not exhausted."

Maya looked back at the glistening rings one last time before turning toward the maintenance console. When she picked up her tools, the task felt lighter, the numbers clearer, and for the first time since leaving Earth, she felt entirely at home.
EOT
            ],
        ];

        $created = [];
        foreach ($samples as $sample) {
            $story = Story::create([
                'user_id' => $user->id,
                'title' => $sample['title'],
                'author' => $sample['author'],
                'category' => $sample['category'],
                'summary' => $sample['summary'],
                'content' => $sample['content'],
                'cover_color' => $sample['cover_color'],
                'tags' => $sample['tags'],
                'status' => 'unread',
                'is_favorite' => false,
            ]);
            $created[] = $story;
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Sample stories added successfully',
            'data' => $created,
        ]);
    }

    /**
     * Upload an image to be embedded in a story.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpeg,png,jpg,gif,webp,svg', 'max:10240'],
        ]);

        $file = $request->file('image');
        $path = $file->store('stories', 'public');
        $url = '/storage/' . $path;

        return response()->json([
            'status' => 'success',
            'message' => 'Image uploaded successfully',
            'url' => $url,
            'filename' => $file->getClientOriginalName(),
        ], 201);
    }

    /**
     * Get all sibling parts in the same series for a given story.
     */
    public function getParts(Request $request, int $id): JsonResponse
    {
        $story = Story::forUser($request->user()->id)->findOrFail($id);
        return response()->json([
            'status' => 'success',
            'data' => $story->getSiblingParts(),
        ]);
    }

    /**
     * Get all multi-part story series for the authenticated user, grouped with aggregated stats.
     */
    public function seriesIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        $stories = Story::forUser($user->id)
            ->whereNotNull('series_name')
            ->where('series_name', '!=', '')
            ->orderBy('series_name', 'asc')
            ->orderBy('part_number', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $grouped = $stories->groupBy('series_name')->map(function ($parts, $seriesName) {
            $totalWords = $parts->sum('word_count');
            $completedCount = $parts->where('status', 'completed')->count();
            $readingCount = $parts->where('status', 'reading')->count();
            $unreadCount = $parts->where('status', 'unread')->count();
            $firstPart = $parts->first();
            $latestRead = $parts->whereNotNull('last_read_at')->sortByDesc('last_read_at')->first();

            $avgProgress = $parts->count() > 0 ? (int) round($parts->avg('reading_progress')) : 0;

            return [
                'series_name' => $seriesName,
                'parts_count' => $parts->count(),
                'total_words' => $totalWords,
                'estimated_reading_time' => (int) ceil($totalWords / 200),
                'completed_count' => $completedCount,
                'reading_count' => $readingCount,
                'unread_count' => $unreadCount,
                'overall_progress' => $avgProgress,
                'author' => $firstPart->author ?? 'Anonymous',
                'category' => $firstPart->category ?? 'General',
                'cover_color' => $firstPart->cover_color ?? '#3b82f6',
                'last_read_at' => $latestRead ? $latestRead->last_read_at : null,
                'parts' => $parts->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'title' => $p->title,
                        'part_number' => $p->part_number,
                        'part_title' => $p->part_title,
                        'status' => $p->status,
                        'reading_progress' => $p->reading_progress,
                        'last_read_paragraph' => $p->last_read_paragraph,
                        'word_count' => $p->word_count,
                        'estimated_reading_time' => $p->estimated_reading_time,
                        'is_favorite' => $p->is_favorite,
                    ];
                })->values(),
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'data' => $grouped,
        ]);
    }

    /**
     * Batch assign or reorder a list of stories under a series name.
     */
    public function assignSeries(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'series_name' => ['required', 'string', 'max:255'],
            'stories' => ['required', 'array'],
            'stories.*.id' => ['required', 'integer'],
            'stories.*.part_number' => ['nullable', 'integer', 'min:1'],
        ]);

        $user = $request->user();
        $seriesName = trim($validated['series_name']);
        $updatedCount = 0;

        foreach ($validated['stories'] as $idx => $item) {
            $story = Story::forUser($user->id)->find($item['id']);
            if ($story) {
                $partNum = $item['part_number'] ?? ($idx + 1);
                $story->update([
                    'series_name' => $seriesName,
                    'part_number' => $partNum,
                ]);
                $updatedCount++;
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully assigned {$updatedCount} stories to series '{$seriesName}'",
        ]);
    }

    /**
     * Auto-detect potential series from existing stories based on common naming patterns.
     */
    public function autoDetectSeries(Request $request): JsonResponse
    {
        $user = $request->user();
        $stories = Story::forUser($user->id)
            ->where(function ($q) {
                $q->whereNull('series_name')->orWhere('series_name', '');
            })
            ->get(['id', 'title', 'author', 'category', 'cover_color', 'word_count']);

        $candidates = [];

        foreach ($stories as $story) {
            $title = trim($story->title);

            // Pattern 1: "... - Part 2" or "... – Part 2" or "... : Part 2"
            if (preg_match('/^(.*?)\s*[-–:]\s*part\s*(\d+)(.*)$/i', $title, $m)) {
                $baseName = trim($m[1]);
                $partNum = (int) $m[2];
                $candidates[$baseName][] = [
                    'story_id' => $story->id,
                    'title' => $story->title,
                    'suggested_part' => $partNum,
                    'author' => $story->author,
                    'category' => $story->category,
                ];
            }
            // Pattern 2: "... (Part 2)" or "... [Part 2]"
            elseif (preg_match('/^(.*?)\s*[\(\[]part\s*(\d+)[\)\]](.*)$/i', $title, $m)) {
                $baseName = trim($m[1]);
                $partNum = (int) $m[2];
                $candidates[$baseName][] = [
                    'story_id' => $story->id,
                    'title' => $story->title,
                    'suggested_part' => $partNum,
                    'author' => $story->author,
                    'category' => $story->category,
                ];
            }
            // Pattern 3: "part 1", "part 2", "part 3" (matching user's exact case!)
            elseif (preg_match('/^part\s*(\d+)/i', $title, $m)) {
                // Group by author or category if available, otherwise "Multi-Part Collection"
                $baseName = !empty($story->author) && $story->author !== 'Anonymous'
                    ? "{$story->author}'s Series"
                    : (!empty($story->category) && $story->category !== 'General'
                        ? "{$story->category} Series"
                        : "Stories Collection");
                $partNum = (int) $m[1];
                $candidates[$baseName][] = [
                    'story_id' => $story->id,
                    'title' => $story->title,
                    'suggested_part' => $partNum,
                    'author' => $story->author,
                    'category' => $story->category,
                ];
            }
        }

        $result = [];
        foreach ($candidates as $name => $items) {
            usort($items, fn($a, $b) => $a['suggested_part'] <=> $b['suggested_part']);
            $result[] = [
                'series_name' => $name,
                'count' => count($items),
                'items' => $items,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }

    /**
     * Get complete offline bundle of all stories for the authenticated user.
     * Supports optional 'since' timestamp to fetch modified stories.
     */
    public function offlineBundle(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Story::forUser($user->id);

        if ($request->filled('since')) {
            try {
                $since = Carbon::parse($request->get('since'));
                $query->where('updated_at', '>=', $since);
            } catch (\Exception $e) {
                // If invalid date format, continue with full query
            }
        }

        $stories = $query->orderBy('series_name', 'asc')
            ->orderBy('part_number', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Overall stats for authenticated user
        $baseQuery = Story::forUser($user->id);
        $totalStories = (clone $baseQuery)->count();
        $totalWords = (clone $baseQuery)->sum('word_count');
        $completedCount = (clone $baseQuery)->where('status', 'completed')->count();
        $readingCount = (clone $baseQuery)->where('status', 'reading')->count();
        $favoritesCount = (clone $baseQuery)->where('is_favorite', true)->count();
        $categories = (clone $baseQuery)->select('category')
            ->distinct()
            ->whereNotNull('category')
            ->pluck('category')
            ->values();

        $seriesList = (clone $baseQuery)->whereNotNull('series_name')
            ->where('series_name', '!=', '')
            ->distinct()
            ->pluck('series_name')
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $stories,
            'count' => $stories->count(),
            'synced_at' => Carbon::now()->toIso8601String(),
            'stats' => [
                'total_stories' => $totalStories,
                'total_words' => (int) $totalWords,
                'completed_count' => $completedCount,
                'reading_count' => $readingCount,
                'favorites_count' => $favoritesCount,
                'categories' => $categories,
                'series_count' => $seriesList->count(),
                'series_list' => $seriesList,
            ],
        ]);
    }

    /**
     * Batch sync reading progress recorded while offline.
     */
    public function batchProgressSync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'updates' => ['required', 'array'],
            'updates.*.story_id' => ['required', 'integer'],
            'updates.*.progress' => ['required', 'integer', 'min:0', 'max:100'],
            'updates.*.paragraph_index' => ['nullable', 'integer', 'min:0'],
            'updates.*.timestamp' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $synced = [];

        foreach ($validated['updates'] as $item) {
            $story = Story::forUser($user->id)->find($item['story_id']);
            if (!$story) continue;

            $progress = (int) $item['progress'];
            $updates = [
                'reading_progress' => max((int) $story->reading_progress, $progress),
                'last_read_at' => !empty($item['timestamp']) ? Carbon::parse($item['timestamp']) : Carbon::now(),
            ];

            if (isset($item['paragraph_index']) && $item['paragraph_index'] !== null) {
                $updates['last_read_paragraph'] = (int) $item['paragraph_index'];
            }

            if ($progress >= 95) {
                $updates['status'] = 'completed';
            } elseif ($progress > 0 && $story->status === 'unread') {
                $updates['status'] = 'reading';
            }

            $story->update($updates);
            $synced[] = [
                'id' => $story->id,
                'reading_progress' => $story->reading_progress,
                'last_read_paragraph' => $story->last_read_paragraph,
                'status' => $story->status,
            ];
        }

        return response()->json([
            'status' => 'success',
            'synced_count' => count($synced),
            'synced' => $synced,
        ]);
    }

    /**
     * Helper to normalize tags input.
     */
    protected function normalizeTags($tags): ?array
    {
        if (is_null($tags)) {
            return null;
        }

        if (is_array($tags)) {
            return array_values(array_filter(array_map('trim', $tags)));
        }

        if (is_string($tags)) {
            $parts = explode(',', $tags);
            return array_values(array_filter(array_map('trim', $parts)));
        }

        return null;
    }
}
