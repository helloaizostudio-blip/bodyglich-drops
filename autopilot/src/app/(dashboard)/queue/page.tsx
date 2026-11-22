import Link from "next/link";
import { Badge, EmptyState, Notice, PageHeader, ScoreBadge } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { regenerateImageAction, rejectPinAction, savePinAction } from "@/app/actions";
import { getProduct, listPins } from "@/database/repositories";
import { getSettings } from "@/database/settings";
import { checkAffiliateLink } from "@/services/amazon/links";
import { ASSOCIATES_STATEMENT, DESCRIPTION_MAX, TITLE_MAX } from "@/services/content-generation/compliance";
import { STYLE_LABELS, type PinStyle } from "@/services/image-generation/styles";
import { getCampaign } from "@/services/trends/seasonal-calendar";
import { config } from "@/utils/config";

export default async function QueuePage() {
  const [drafts, settings] = await Promise.all([listPins({ status: "draft", limit: 200 }), getSettings()]);
  const products = new Map((await Promise.all([...new Set(drafts.map((d) => d.product_id))].map(getProduct))).filter(Boolean).map((p) => [p!.id, p!]));
  const ordered = [...drafts].sort((a, b) => a.product_id.localeCompare(b.product_id) || a.concept_index - b.concept_index);

  return (
    <>
      <PageHeader
        title="Approval queue"
        description="Nothing is published without your approval. Edit the copy, check the link, then approve. Approved pins get the next free posting slot."
      />
      {!settings.requireApproval && (
        <div className="mb-5">
          <Notice tone="red" title="Auto-approval is on">Drafts without compliance flags are approved automatically. Turn it off in Settings to review every pin.</Notice>
        </div>
      )}

      {ordered.length === 0 ? (
        <EmptyState title="Queue is empty">
          Shortlisted products get drafts automatically after discovery, or open a product and click <em>Create pins</em>.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {ordered.map((pin) => {
            const product = products.get(pin.product_id);
            const link = checkAffiliateLink(pin.link, config.amazon.partnerTag, product?.asin);
            const body = pin.description.replace(/^#ad\s*/i, "").replace(ASSOCIATES_STATEMENT, "").trim();
            return (
              <article key={pin.id} id={pin.id} className="card scroll-mt-6 overflow-hidden">
                <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                  <div className="border-b border-zinc-100 bg-zinc-50 p-4 md:border-b-0 md:border-r">
                    {pin.image_file ? (
                      <a href={`/api/media/${pin.image_file}`} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/media/${pin.image_file}`} alt={pin.alt_text} className="aspect-[2/3] w-full rounded-lg object-cover shadow-sm ring-1 ring-zinc-200" />
                      </a>
                    ) : (
                      <div className="grid aspect-[2/3] place-items-center rounded-lg bg-zinc-100 text-xs text-zinc-500">Image missing</div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge>{STYLE_LABELS[pin.style as PinStyle] ?? pin.style}</Badge>
                      <Badge tone={pin.image_source === "higgsfield" ? "violet" : "gray"}>{pin.image_source === "higgsfield" ? "AI background" : "original template"}</Badge>
                      <Badge tone={pin.copy_source === "claude" ? "blue" : "gray"}>{pin.copy_source === "claude" ? "Claude copy" : "template copy"}</Badge>
                    </div>
                    <form action={regenerateImageAction} className="mt-3">
                      <input type="hidden" name="pinId" value={pin.id} />
                      <input type="hidden" name="returnTo" value="/queue" />
                      <SubmitButton variant="secondary" size="sm" pendingText="Rendering…" className="w-full">Re-render image</SubmitButton>
                    </form>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/products/${pin.product_id}`} className="text-sm font-semibold text-zinc-900 hover:text-brand-700">
                          {product?.title ?? "Unknown product"}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                          <ScoreBadge score={product?.score ?? null} />
                          {pin.campaign && <Badge tone="violet">{getCampaign(pin.campaign)?.label}</Badge>}
                          <span>Concept {pin.concept_index + 1}</span>
                        </div>
                      </div>
                    </div>

                    {pin.compliance_flags.length > 0 && (
                      <div className="mb-4">
                        <Notice title="Check before approving">
                          <ul className="list-disc pl-5">
                            {pin.compliance_flags.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        </Notice>
                      </div>
                    )}
                    {pin.last_error && (
                      <div className="mb-4">
                        <Notice tone="red">{pin.last_error}</Notice>
                      </div>
                    )}

                    <form action={savePinAction} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="pinId" value={pin.id} />
                      <input type="hidden" name="returnTo" value="/queue" />
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor={`title-${pin.id}`}>Pin title (max {TITLE_MAX})</label>
                        <input className="input" id={`title-${pin.id}`} name="title" defaultValue={pin.title} maxLength={TITLE_MAX} required />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor={`desc-${pin.id}`}>Description (the #ad tag and Associates statement are added automatically; total max {DESCRIPTION_MAX})</label>
                        <textarea className="textarea" id={`desc-${pin.id}`} name="description" rows={4} defaultValue={body} required />
                        <p className="mt-1 text-[11px] text-zinc-500">Published as: “#ad {body.slice(0, 60)}… {ASSOCIATES_STATEMENT}”</p>
                      </div>
                      <div>
                        <label className="label" htmlFor={`headline-${pin.id}`}>On-image headline</label>
                        <input className="input" id={`headline-${pin.id}`} name="headline" defaultValue={pin.headline} required />
                      </div>
                      <div>
                        <label className="label" htmlFor={`sub-${pin.id}`}>On-image subheadline</label>
                        <input className="input" id={`sub-${pin.id}`} name="subheadline" defaultValue={pin.subheadline ?? ""} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`board-${pin.id}`}>Board</label>
                        <select className="select" id={`board-${pin.id}`} name="board" defaultValue={pin.board}>
                          {settings.boards.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name}
                              {b.pinterestBoardId ? "" : " (no board ID)"}
                            </option>
                          ))}
                          {!settings.boards.some((b) => b.name === pin.board) && <option value={pin.board}>{pin.board}</option>}
                        </select>
                      </div>
                      <div>
                        <label className="label" htmlFor={`kw-${pin.id}`}>Keywords (comma separated)</label>
                        <input className="input" id={`kw-${pin.id}`} name="keywords" defaultValue={pin.keywords.join(", ")} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor={`link-${pin.id}`}>Affiliate destination URL</label>
                        <div className="flex gap-2">
                          <input className="input font-mono text-xs" id={`link-${pin.id}`} name="link" defaultValue={pin.link} required />
                          <a href={pin.link} target="_blank" rel="noreferrer nofollow sponsored" className="btn btn-secondary btn-sm">Open</a>
                        </div>
                        <p className={`mt-1 text-xs ${link.valid ? "text-emerald-700" : "text-red-700"}`}>{link.reason}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor={`alt-${pin.id}`}>Alt text</label>
                        <input className="input" id={`alt-${pin.id}`} name="alt_text" defaultValue={pin.alt_text} />
                      </div>
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <SubmitButton name="intent" value="approve" pendingText="Approving…">Save & approve</SubmitButton>
                        <SubmitButton variant="secondary" name="intent" value="save" pendingText="Saving…">Save</SubmitButton>
                      </div>
                    </form>
                    <form action={rejectPinAction} className="mt-2">
                      <input type="hidden" name="pinId" value={pin.id} />
                      <input type="hidden" name="returnTo" value="/queue" />
                      <SubmitButton variant="danger" size="sm">Reject</SubmitButton>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
