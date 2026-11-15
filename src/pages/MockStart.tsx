import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { ALL_QUESTIONS } from '../lib/content'
import { DEFAULT_MOCK_SIZE, MOCK_MINUTES, MOCK_SIZES, quotasFor } from '../lib/mock'
import { startMock } from '../lib/start'
import { useAppState } from '../lib/store'
import { SECTION_LABEL } from '../lib/topics'

export function MockStart() {
  const state = useAppState()
  const navigate = useNavigate()
  const total = ALL_QUESTIONS.length
  const [size, setSize] = useState(Math.min(DEFAULT_MOCK_SIZE, total))
  const [asking, setAsking] = useState(false)

  const unfinished = state.session && !state.session.finished ? state.session : null
  const allQuotas = quotasFor(ALL_QUESTIONS, size)
  const quotas = allQuotas.filter((q) => q.want > 0)
  // English has no multiple-choice questions written yet. The quota list below
  // hides empty sections, so without saying this a reader sees only Aptitude
  // and Technical and never learns a whole section is missing.
  const noEnglish = (allQuotas.find((q) => q.section === 'english')?.available ?? 0) === 0

  function begin() {
    startMock(size)
    navigate('/session')
  }

  return (
    <>
      <div className="stack">
        <PageHeader title="Mock exam" backTo="/" />

        <div className="hero">
          <div className="hero-grid">
            <div className="hero-cell">
              <div className="big-number">3</div>
              <p className="sub" style={{ margin: 0 }}>
                hours
              </p>
            </div>
            <div className="hero-split" aria-hidden="true" />
            <div className="hero-cell right">
              <div className="big-number">{size}</div>
              <p className="sub" style={{ margin: 0 }}>
                questions
              </p>
            </div>
          </div>
        </div>

        <div className="card stack-s">
          <h2 className="section" style={{ marginTop: 0 }}>
            How this works
          </h2>
          <ul className="sub steps">
            <li>One clock for the whole paper, {MOCK_MINUTES} minutes.</li>
            <li>You can skip a question and come back to it.</li>
            <li>You can change an answer at any time.</li>
            <li>No answers and no reasons until you hand the paper in.</li>
            <li>The clock keeps running if you close the app.</li>
          </ul>
        </div>

        {/* Being straight about what is real and what is guessed. The user
            is preparing for one exam that matters; a made-up number
            presented as fact would be worse than no number. */}
        <div className="card stack-s">
          <h2 className="section" style={{ marginTop: 0 }}>
            What is real and what is a guess
          </h2>
          <p className="sub" style={{ margin: 0 }}>
            <b>Real:</b> the date, the place and the subjects. KSHRD list the nine
            technical subjects on their own recruitment page, and this app follows that
            list.
          </p>
          <p className="sub" style={{ margin: 0 }}>
            <b>Three hours is our best information, but we could not confirm it.</b>{' '}
            KSHRD&rsquo;s FAQ does ask &ldquo;How long does the written test take?&rdquo;,
            so a real answer exists. But the answer does not load on their site, and it
            is missing from every saved copy of that page going back to December 2024. We
            set three hours because practising long costs you little if the real test is
            shorter. Ask them to be sure.
          </p>
          <p className="sub" style={{ margin: 0 }}>
            <b>A guess:</b> how many questions there are and how they are split between
            the sections. Nobody has published it. So the length and the mix below are
            chosen to be useful practice, not a copy of the real paper.
          </p>
          <p className="sub" style={{ margin: 0 }}>
            <b>Not known:</b> whether a wrong answer loses marks. Nothing here takes marks
            off, so a guess costs you nothing in this app. Ask KSHRD before you rely on
            that in the real test.
          </p>
        </div>

        <div className="card stack-s">
          <h2 className="section" style={{ marginTop: 0 }}>
            How long
          </h2>
          <div className="chip-row">
            {MOCK_SIZES.filter((n) => n <= total).map((n) => (
              <button
                key={n}
                type="button"
                className={`chip${n === size ? ' on' : ''}`}
                aria-pressed={n === size}
                onClick={() => setSize(n)}
              >
                {n} questions
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: 0 }}>
            {total} questions in the app so far. The clock stays at three hours whichever
            you pick, so a shorter paper gives you more time per question.
          </p>
        </div>

        <div className="card stack-s">
          <h2 className="section" style={{ marginTop: 0 }}>
            What you will get
          </h2>
          {quotas.map((q) => (
            <div key={q.section} className="secrow">
              <div className="top">
                <span>{SECTION_LABEL[q.section]}</span>
                <span>{q.want}</span>
              </div>
            </div>
          ))}
          <p className="sub" style={{ margin: 0 }}>
            Spread across the topics inside each section. Sections with no questions
            written yet are skipped, and their share goes to the others.
          </p>
          {noEnglish ? (
            <p className="sub" style={{ margin: 0 }}>
              <b>English is missing from this list on purpose.</b> No English questions
              are written yet, so this paper asks none. Do not read a good score here as
              being ready for the English part.
            </p>
          ) : null}
        </div>

        <p className="sub">
          The real paper also has an English writing section. This mock does not mark
          writing, so set aside another 30 minutes to write an essay by hand.
        </p>
      </div>

      <div className="actionbar">
        <div>
          {asking ? (
            <div className="stack-s">
              <p className="notice warn" style={{ margin: 0 }}>
                You have a set you did not finish. Starting the mock will drop it.
              </p>
              <div className="btn-row">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setAsking(false)}
                >
                  Keep it
                </button>
                <button className="btn btn-primary" type="button" onClick={begin}>
                  Drop it and start
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              disabled={total === 0}
              onClick={() => (unfinished ? setAsking(true) : begin())}
            >
              Start the {MOCK_MINUTES}-minute mock
            </button>
          )}
        </div>
      </div>
    </>
  )
}
