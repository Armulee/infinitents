# Technical Architecture

## Stack

Frontend

* Next.js App Router
* TypeScript
* TailwindCSS
* shadcn/ui
* Framer Motion

Backend

* Supabase
* PostgreSQL
* Edge Functions

State

* Zustand
* React Query

Storage

* Supabase Storage

---

## Multi Tenant

workspace
→ brands
→ projects
→ videos

Every resource belongs to a workspace.

Implement RLS.

---

## Core Tables

users

workspaces

brands

brand_knowledge

generated_ideas

scripts

audit_reports

storyboards

image_references

video_projects

generated_videos

publishing_jobs

analytics

platform_connections

ai_jobs

---

## Job System

Stages:

brand_extraction

idea_generation

script_generation

audit

storyboard

image_generation

prompt_packing

video_generation

editing

publishing

analytics_sync

Every stage should be queue-based.

---

## Realtime

Use Supabase Realtime.

Display:

* generation progress
* publishing status
* rendering status
* analytics updates

---

## Video Editor

Requirements:

CapCut simplicity.

Canva usability.

Features:

* Timeline
* Scene Editor
* Subtitle Editor
* Asset Library
* Audio Controls
* Transition Controls

Built-in AI Chat Panel.

---

## Integrations

TikTok

Instagram

YouTube Shorts

Facebook Reels

Support:

* Publishing
* Scheduling
* Analytics

---

## Future Architecture

Support model swapping.

Never hardcode AI providers.

Use provider abstraction.

Examples:

Idea Generation:

* Claude
* GPT
* Gemini

Image:

* GPT Image
* Flux

Video:

* Seedance
* Veo
* Kling

Models can be replaced without changing business logic.
