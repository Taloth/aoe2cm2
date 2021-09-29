import Draft from "../../models/Draft";
import Preset from "../../models/Preset";
import DraftViews from "../../models/DraftViews";
import PlayerEvent from "../../models/PlayerEvent";
import Player from "../../constants/Player";
import ActionType from "../../constants/ActionType";
import Civilisation from "../../models/Civilisation";
import Turn from "../../models/Turn";
import DraftOption from "../../models/DraftOption";
import Action from "../../constants/Action";
import Exclusivity from "../../constants/Exclusivity";

it('Regular Draft looks the same for everyone', () => {
    const nameHost = `host`;
    const nameGuest = `guest`;
    const presetId = 'presetId'
    const preset = Preset.fromPojo({...Preset.SIMPLE, presetId}) as Preset;
    const draft = new Draft(nameHost, nameGuest, preset);
    draft.events.push(new PlayerEvent(Player.HOST, ActionType.PICK, Civilisation.AZTECS.id));
    const draftViews = new DraftViews(draft);

    expect(draftViews.getHostDraft()).toEqual(draftViews.getGuestDraft());
    expect(draftViews.getHostDraft()).toEqual(draftViews.getSpecDraft());
});

function prepareDraftViews(turns: Turn[]) {
    const nameHost = `host`;
    const nameGuest = `guest`;
    const preset = new Preset('Hidden Preset', Civilisation.ALL, turns) as Preset;
    const draft = new Draft(nameHost, nameGuest, preset);
    return new DraftViews(draft);
}

it('Guest and Spec cannot see hidden Host pick before reveal', () => {
    const draftViews = prepareDraftViews([Turn.HOST_HIDDEN_PICK, Turn.REVEAL_ALL]);

    draftViews.addDraftEvent(new PlayerEvent(Player.HOST, ActionType.PICK, Civilisation.AZTECS.id));

    const hostEvent = draftViews.getHostDraft().events[0] as PlayerEvent;
    const guestEvent = draftViews.getGuestDraft().events[0] as PlayerEvent;
    const specEvent = draftViews.getSpecDraft().events[0] as PlayerEvent;
    expect(hostEvent.chosenOptionId).toEqual(Civilisation.AZTECS.id);
    expect(guestEvent.chosenOptionId).toEqual(DraftOption.HIDDEN_PICK.id);
    expect(specEvent.chosenOptionId).toEqual(DraftOption.HIDDEN_PICK.id);
});

it('Guest and Spec can see hidden Host pick after reveal', () => {
    const draftViews = prepareDraftViews([Turn.HOST_HIDDEN_PICK, Turn.REVEAL_ALL]);

    draftViews.addDraftEvent(new PlayerEvent(Player.HOST, ActionType.PICK, Civilisation.AZTECS.id));
    draftViews.reveal(Action.REVEAL_ALL);

    const hostEvent = draftViews.getHostDraft().events[0] as PlayerEvent;
    const guestEvent = draftViews.getGuestDraft().events[0] as PlayerEvent;
    const specEvent = draftViews.getSpecDraft().events[0] as PlayerEvent;
    expect(hostEvent.chosenOptionId).toEqual(Civilisation.AZTECS.id);
    expect(guestEvent.chosenOptionId).toEqual(Civilisation.AZTECS.id);
    expect(specEvent.chosenOptionId).toEqual(Civilisation.AZTECS.id);
});


it('Host can see own hidden pick as opponent, but Guest cannot', () => {
    const draftViews = prepareDraftViews([
        new Turn(Player.GUEST, Action.PICK, Exclusivity.NONEXCLUSIVE, true, false, Player.HOST),
        Turn.REVEAL_ALL,
    ]);

    draftViews.addDraftEvent(new PlayerEvent(Player.GUEST, ActionType.PICK, Civilisation.AZTECS.id, false, Player.HOST));

    const hostEvent = draftViews.getHostDraft().events[0] as PlayerEvent;
    const guestEvent = draftViews.getGuestDraft().events[0] as PlayerEvent;
    const specEvent = draftViews.getSpecDraft().events[0] as PlayerEvent;
    expect(hostEvent.chosenOptionId).toEqual(Civilisation.AZTECS.id);
    expect(guestEvent.chosenOptionId).toEqual(DraftOption.HIDDEN_PICK.id);
    expect(specEvent.chosenOptionId).toEqual(DraftOption.HIDDEN_PICK.id);
});



it('Guest and Spec can see hidden Host pick after reveal', () => {
    const draftViews = prepareDraftViews([
        new Turn(Player.GUEST, Action.PICK, Exclusivity.NONEXCLUSIVE, true, false, Player.HOST),
        Turn.REVEAL_ALL,
    ]);

    draftViews.addDraftEvent(new PlayerEvent(Player.GUEST, ActionType.PICK, Civilisation.AZTECS.id, false, Player.HOST));
    draftViews.reveal(Action.REVEAL_ALL);

    const hostEvent = draftViews.getHostDraft().events[0] as PlayerEvent;
    const guestEvent = draftViews.getGuestDraft().events[0] as PlayerEvent;
    const specEvent = draftViews.getSpecDraft().events[0] as PlayerEvent;
    expect(hostEvent.chosenOptionId).toEqual(Civilisation.AZTECS.id);
    expect(guestEvent.chosenOptionId).toEqual(Civilisation.AZTECS.id);
    expect(specEvent.chosenOptionId).toEqual(Civilisation.AZTECS.id);
});
