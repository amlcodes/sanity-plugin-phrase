import Card from '~/components/Card'
import Container from '~/components/Container'
import { Post } from '~/lib/sanity.queries'

export default async function PostsIndex({ data: posts }: { data: Post[] }) {
  return (
    <Container>
      <section>
        {posts.length ? (
          posts.map((post) => <Card key={post._id} post={post} />)
        ) : (
          <div>No posts found</div>
        )}
      </section>
    </Container>
  )
}
