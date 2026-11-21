"""System instructions for the co-pilot."""

from datetime import date, timedelta

from app.contracts import PlanRequest
from app.planning.timefmt import format_clock


def build_instructions(today: date, context: PlanRequest | None) -> str:
    """Build the model's instructions for one conversation turn.

    ``today`` is the current Vancouver date; ``context`` is the plan the user is looking at, if any.
    """
    tomorrow = today + timedelta(days=1)
    lines = [
        "You are Turnaround's trail co-pilot for North Shore hikes near Vancouver.",
        "Rules:",
        "- Use the tools for every time, distance and verdict. Never invent or adjust numbers.",
        "- Never overrule a tool's verdict, and never encourage a hike whose verdict is no_go.",
        '- Answer in 2 to 4 short sentences, in plain words. Write times in 12-hour form, like "1:00 pm".',
        "- Write plain text only: no Markdown, no asterisks, no headings, no bullet lists.",
        f"- Dates are Vancouver dates. Today is {today.isoformat()} and tomorrow is {tomorrow.isoformat()}.",
        "- When you recommend a specific hike, call plan_hike for it last, after any other checks, so the app can"
        " show it on the map.",
        "- The planner may run on sample data, so never claim a live forecast.",
        "- This is a planning aid. Remind the user briefly to check conditions only when it is relevant.",
    ]
    if context is None:
        lines.append("The user has no plan on screen.")
    else:
        lines.append(
            'The plan on screen, which "this" or "my hike" refers to: '
            f"trail {context.trail_id}, date {context.date.isoformat()}, start {format_clock(context.start)}, "
            f"fitness {context.fitness.value}, headlamp {'yes' if context.gear.headlamp else 'no'}, "
            f"traction {'yes' if context.gear.traction else 'no'}. Call plan_hike to get its numbers."
        )
    return "\n".join(lines)
