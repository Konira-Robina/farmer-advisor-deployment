from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage
from pydantic import Field


class ScriptedModel(GenericFakeChatModel):
    """A fake chat model that replays a fixed list of replies and accepts tools."""

    def bind_tools(self, tools, **kwargs):
        return self


def tool_call(name: str, args: dict, call_id: str = "call_1") -> dict:
    return {"name": name, "args": args, "id": call_id, "type": "tool_call"}


def ai(content: str = "", tool_calls: list | None = None, usage: tuple[int, int] | None = None) -> AIMessage:
    kwargs = {}
    if usage:
        kwargs["usage_metadata"] = {
            "input_tokens": usage[0],
            "output_tokens": usage[1],
            "total_tokens": usage[0] + usage[1],
        }
    return AIMessage(content=content, tool_calls=tool_calls or [], **kwargs)


def scripted(*replies: AIMessage) -> ScriptedModel:
    return ScriptedModel(messages=iter(list(replies)))


class RecordingModel(ScriptedModel):
    """Scripted model that also keeps every message list it was called with."""

    seen: list = Field(default_factory=list)

    def _generate(self, messages, *args, **kwargs):
        self.seen.append(list(messages))
        return super()._generate(messages, *args, **kwargs)


def recording(*replies: AIMessage) -> RecordingModel:
    return RecordingModel(messages=iter(list(replies)))
