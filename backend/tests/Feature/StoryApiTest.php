<?php

namespace Tests\Feature;

use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_stories_with_stats_and_pagination(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        Story::create([
            'user_id' => $user->id,
            'title' => 'First Free Time Story',
            'author' => 'Author A',
            'category' => 'Philosophy',
            'content' => 'Once upon a time in a peaceful garden, the gardener observed the blossoming lotus.',
            'status' => 'unread',
            'is_favorite' => true,
        ]);

        Story::create([
            'user_id' => $user->id,
            'title' => 'Second SciFi Story',
            'author' => 'Author B',
            'category' => 'Sci-Fi',
            'content' => 'The spaceship hovered silently above the atmospheric rings of the blue giant star.',
            'status' => 'reading',
            'is_favorite' => false,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/stories');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('total', 2)
            ->assertJsonPath('stats.total_stories', 2)
            ->assertJsonPath('stats.favorites_count', 1)
            ->assertJsonPath('stats.reading_count', 1);
    }

    public function test_can_create_story_and_computes_word_count_automatically(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $content = str_repeat('Knowledge and patience bring serenity. ', 50); // 250 words

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stories', [
                'title' => 'The Art of Quiet Patience',
                'author' => 'Sage',
                'category' => 'Wisdom',
                'content' => $content,
                'cover_color' => '#10b981',
                'tags' => ['patience', 'mindset'],
                'is_favorite' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'The Art of Quiet Patience')
            ->assertJsonPath('data.is_favorite', true);

        $story = Story::where('title', 'The Art of Quiet Patience')->first();
        $this->assertNotNull($story);
        $this->assertGreaterThan(200, $story->word_count);
        $this->assertGreaterThanOrEqual(1, $story->estimated_reading_time);
        $this->assertNotEmpty($story->summary);
    }

    public function test_can_view_story_and_tracks_last_read(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $story = Story::create([
            'user_id' => $user->id,
            'title' => 'Reading Journey Story',
            'category' => 'Adventure',
            'content' => 'Deep in the misty valley lay an ancient stone tower.',
            'status' => 'unread',
        ]);

        $this->assertNull($story->last_read_at);
        $this->assertEquals('unread', $story->status);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/stories/{$story->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Reading Journey Story')
            ->assertJsonPath('data.status', 'reading');

        $story->refresh();
        $this->assertNotNull($story->last_read_at);
        $this->assertEquals('reading', $story->status);
    }

    public function test_can_update_story(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $story = Story::create([
            'user_id' => $user->id,
            'title' => 'Original Title',
            'content' => 'Original long narrative.',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/stories/{$story->id}", [
                'title' => 'Updated Glorious Title',
                'category' => 'Inspirational',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Updated Glorious Title')
            ->assertJsonPath('data.category', 'Inspirational');
    }

    public function test_can_delete_story(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $story = Story::create([
            'user_id' => $user->id,
            'title' => 'To be deleted',
            'content' => 'Short text.',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/stories/{$story->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('stories', ['id' => $story->id]);
    }

    public function test_can_toggle_favorite_and_update_progress(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $story = Story::create([
            'user_id' => $user->id,
            'title' => 'Progress Story',
            'content' => 'Reading through chapter one and two.',
            'is_favorite' => false,
            'status' => 'reading',
        ]);

        // Toggle Favorite
        $favResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/stories/{$story->id}/favorite");
        $favResponse->assertStatus(200)
            ->assertJsonPath('data.is_favorite', true);

        // Update progress to 50% with paragraph_index 4
        $progResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/stories/{$story->id}/progress", [
                'progress' => 50,
                'paragraph_index' => 4,
            ]);
        $progResponse->assertStatus(200)
            ->assertJsonPath('data.reading_progress', 50)
            ->assertJsonPath('data.last_read_paragraph', 4);

        // Update progress to 100%
        $progComplete = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/stories/{$story->id}/progress", ['progress' => 100]);
        $progComplete->assertStatus(200)
            ->assertJsonPath('data.reading_progress', 100)
            ->assertJsonPath('data.status', 'completed');
    }

    public function test_can_seed_sample_stories(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stories/samples');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertCount(3, Story::where('user_id', $user->id)->get());
    }

    public function test_can_upload_story_image(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        $file = UploadedFile::fake()->image('illustration.png', 800, 600);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stories/upload-image', [
                'image' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['status', 'url', 'filename']);

        $url = $response->json('url');
        $this->assertStringStartsWith('/storage/stories/', $url);
    }

    public function test_can_manage_multi_part_series_and_fetch_sibling_parts(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        // Create Part 1
        $res1 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stories', [
                'title' => 'Part 1',
                'series_name' => 'The Epic Odyssey',
                'part_number' => 1,
                'content' => 'First part narrative content.',
            ]);
        $res1->assertStatus(201);
        $story1Id = $res1->json('data.id');

        // Create Part 2 (auto-assigns part_number = 2)
        $res2 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stories', [
                'title' => 'Part 2',
                'series_name' => 'The Epic Odyssey',
                'content' => 'Second part narrative content.',
            ]);
        $res2->assertStatus(201)
            ->assertJsonPath('data.part_number', 2);
        $story2Id = $res2->json('data.id');

        // Show Part 1 - should include sibling_parts (Part 1 and Part 2)
        $showRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/stories/{$story1Id}");
        $showRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(2, 'data.sibling_parts');

        // Series grouped endpoint
        $seriesRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/stories/series');
        $seriesRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.series_name', 'The Epic Odyssey')
            ->assertJsonPath('data.0.parts_count', 2);
    }

    public function test_can_bulk_assign_series_and_auto_detect(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        // Create two standalone stories with naming like "part 1" and "part 2"
        $s1 = Story::create([
            'user_id' => $user->id,
            'title' => 'part 1',
            'author' => 'Ancient Eastern Parable',
            'category' => 'Philosophy & Wisdom',
            'content' => 'Part 1 content text here.',
        ]);
        $s2 = Story::create([
            'user_id' => $user->id,
            'title' => 'part 2',
            'author' => 'Ancient Eastern Parable',
            'category' => 'Philosophy & Wisdom',
            'content' => 'Part 2 content text here.',
        ]);

        // Auto-detect endpoint
        $detectRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stories/series/auto-detect');
        $detectRes->assertStatus(200)
            ->assertJsonPath('status', 'success');

        // Bulk assign them into a named series
        $assignRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/stories/series/assign', [
                'series_name' => 'Ancient Eastern Parable Series',
                'stories' => [
                    ['id' => $s1->id, 'part_number' => 1],
                    ['id' => $s2->id, 'part_number' => 2],
                ],
            ]);
        $assignRes->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertEquals('Ancient Eastern Parable Series', $s1->fresh()->series_name);
        $this->assertEquals(1, $s1->fresh()->part_number);
        $this->assertEquals('Ancient Eastern Parable Series', $s2->fresh()->series_name);
        $this->assertEquals(2, $s2->fresh()->part_number);
    }
}
