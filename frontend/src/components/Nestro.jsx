import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { 
  MessageCircle, 
  X, 
  Search, 
  ArrowLeft, 
  ChevronRight, 
  Sparkles,
  TrendingUp,
  Lightbulb
} from 'lucide-react'
import helpData from '../nestro-help-data.json'

const Nestro = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [hasUnread, setHasUnread] = useState(false)
  const [searchStats, setSearchStats] = useState({})
  const [questionStats, setQuestionStats] = useState({})
  const chatBodyRef = useRef(null)
  const location = useLocation()

  // Load stats from localStorage
  useEffect(() => {
    const savedSearchStats = localStorage.getItem('nestro_search_stats')
    const savedQuestionStats = localStorage.getItem('nestro_question_stats')
    
    if (savedSearchStats) {
      setSearchStats(JSON.parse(savedSearchStats))
    }
    if (savedQuestionStats) {
      setQuestionStats(JSON.parse(savedQuestionStats))
    }

    const hasSeenNestro = localStorage.getItem('nestro_seen')
    if (!hasSeenNestro) {
      setHasUnread(true)
      localStorage.setItem('nestro_seen', 'true')
    }
  }, [])

  // Track search terms
  const trackSearch = (term) => {
    if (!term.trim()) return
    
    const newStats = { ...searchStats }
    newStats[term.toLowerCase()] = (newStats[term.toLowerCase()] || 0) + 1
    setSearchStats(newStats)
    localStorage.setItem('nestro_search_stats', JSON.stringify(newStats))
  }

  // Track question views
  const trackQuestion = (question) => {
    const newStats = { ...questionStats }
    newStats[question] = (newStats[question] || 0) + 1
    setQuestionStats(newStats)
    localStorage.setItem('nestro_question_stats', JSON.stringify(newStats))
  }

  // Get contextual help based on current page
  const getContextualHelp = () => {
    const path = location.pathname
    const contextMap = {
      '/': 'Dashboard',
      '/inventory': 'Inventory & Stock Management',
      '/sales': 'Sales & Transactions',
      '/expenses': 'Expenses',
      '/employees': 'Team & Employee Management',
      '/reports': 'Reports & Analytics',
      '/settings': 'Settings & Configuration'
    }
    
    const categoryName = contextMap[path]
    if (categoryName) {
      return helpData.find(cat => cat.category === categoryName)
    }
    return null
  }

  // Get most searched questions
  const getMostSearchedQuestions = () => {
    const sorted = Object.entries(questionStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
    
    const results = []
    sorted.forEach(([question, count]) => {
      helpData.forEach(category => {
        const q = category.questions.find(q => q.question === question)
        if (q) {
          results.push({
            category: category.category,
            question: q.question,
            answer: q.answer,
            views: count
          })
        }
      })
    })
    return results
  }

  const toggleChat = () => {
    setIsOpen(!isOpen)
    setHasUnread(false)
  }

  const closeChat = () => {
    setIsOpen(false)
  }

  const goBack = () => {
    if (selectedQuestion) {
      setSelectedQuestion(null)
    } else if (selectedCategory) {
      setSelectedCategory(null)
    }
  }

  const selectCategory = (category) => {
    setSelectedCategory(category)
    setSelectedQuestion(null)
  }

  const selectQuestion = (question, answer, categoryName) => {
    setSelectedQuestion({ question, answer, category: categoryName })
    trackQuestion(question)
    // Scroll to top when showing answer
    setTimeout(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = 0
      }
    }, 50)
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    if (term.trim() && term.length >= 3) {
      trackSearch(term)
    }
  }

  // Filter all questions across categories based on search
  const getFilteredResults = () => {
    if (!searchTerm.trim()) return []

    const term = searchTerm.toLowerCase()
    const results = []

    helpData.forEach((category) => {
      category.questions.forEach((q) => {
        if (
          q.question.toLowerCase().includes(term) ||
          q.answer.toLowerCase().includes(term)
        ) {
          results.push({
            category: category.category,
            question: q.question,
            answer: q.answer
          })
        }
      })
    })

    return results.slice(0, 10) // Limit to 10 results
  }

  const filteredResults = getFilteredResults()
  const contextualHelp = getContextualHelp()
  const mostSearched = getMostSearchedQuestions()

  return (
    <>
      {/* Chat Bubble Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Open Nestro Help Assistant"
      >
        {isOpen ? (
          <X className="h-5 w-5 lg:h-6 lg:w-6" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5 lg:h-6 lg:w-6" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 rounded-full bg-orange-500"></span>
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-32 right-2 left-2 lg:bottom-24 lg:right-6 lg:left-auto z-50 flex h-[500px] w-auto lg:h-[600px] lg:w-[400px] flex-col rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              {(selectedCategory || selectedQuestion) && (
                <button
                  onClick={goBack}
                  className="rounded-full p-1 hover:bg-white/20 transition"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h3 className="font-bold text-lg">Nestro</h3>
                <p className="text-xs text-purple-100">Your business assistant</p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="rounded-full p-1 hover:bg-white/20 transition"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Chat Body */}
          <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-4">
            {/* Search Results */}
            {searchTerm.trim() && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
                </p>
                {filteredResults.length === 0 ? (
                  <div className="rounded-lg bg-gray-50 p-6 text-center">
                    <p className="text-sm text-gray-600">
                      No results found. Try different keywords or browse categories below.
                    </p>
                  </div>
                ) : (
                  filteredResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectQuestion(result.question, result.answer, result.category)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-purple-300 hover:bg-purple-50"
                    >
                      <p className="text-xs font-medium text-purple-600">{result.category}</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">{result.question}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">{result.answer}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Question & Answer View */}
            {!searchTerm.trim() && selectedQuestion && (
              <div className="space-y-4">
                <div className="rounded-lg bg-purple-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                    Your Question
                  </p>
                  <p className="mt-2 text-base font-medium text-gray-900">
                    {selectedQuestion.question}
                  </p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">
                    Nestro says
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{selectedQuestion.answer}</p>
                </div>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="w-full rounded-lg border border-purple-200 bg-white py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-50"
                >
                  Ask another question
                </button>
              </div>
            )}

            {/* Category Questions List */}
            {!searchTerm.trim() && selectedCategory && !selectedQuestion && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {selectedCategory.category}
                </p>
                {selectedCategory.questions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectQuestion(q.question, q.answer, selectedCategory.category)}
                    className="group w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-purple-300 hover:bg-purple-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-purple-700">
                        {q.question}
                      </p>
                      <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-purple-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Categories List (Home) */}
            {!searchTerm.trim() && !selectedCategory && !selectedQuestion && (
              <div className="space-y-3">
                {/* Welcome Message */}
                <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">Hi there!</h4>
                  </div>
                  <p className="mt-2 text-sm text-purple-800">
                    I'm Nestro, your business assistant. I'm here to help you get the most out of
                    Ancestra. What would you like to know?
                  </p>
                </div>

                {/* Contextual Help */}
                {contextualHelp && (
                  <>
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-purple-600" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                        Help for this page
                      </p>
                    </div>
                    <div className="space-y-2">
                      {contextualHelp.questions.slice(0, 3).map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectQuestion(q.question, q.answer, contextualHelp.category)}
                          className="group w-full rounded-lg border border-purple-200 bg-purple-50 p-3 text-left transition hover:border-purple-400 hover:bg-purple-100"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-purple-900 group-hover:text-purple-700">
                              {q.question}
                            </p>
                            <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400 group-hover:text-purple-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Most Searched Questions */}
                {mostSearched.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mt-4">
                      <TrendingUp className="h-4 w-4 text-gray-600" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Popular questions
                      </p>
                    </div>
                    <div className="space-y-2">
                      {mostSearched.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectQuestion(item.question, item.answer, item.category)}
                          className="group w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-purple-300 hover:bg-purple-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">{item.category}</p>
                              <p className="mt-1 text-sm font-medium text-gray-900 group-hover:text-purple-700">
                                {item.question}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">{item.views}</span>
                              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-purple-600" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-4">
                  Browse all topics
                </p>

                {helpData.map((category, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectCategory(category)}
                    className="group w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-purple-300 hover:bg-purple-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-purple-700">
                          {category.category}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {category.questions.length} question
                          {category.questions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="rounded-b-2xl border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-center text-xs text-gray-500">
              Need more help? Contact your administrator
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default Nestro
